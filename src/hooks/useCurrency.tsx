'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { convertPriceValue, detectCurrencyFromLocale, getCurrencySymbol, getLocaleForCurrency, SupportedCurrency } from '@/helpers/currency';

interface CurrencyContextValue {
  baseCurrency: SupportedCurrency;
  currencyCode: SupportedCurrency;
  currencySymbol: string;
  exchangeRate: number;
  convertPrice: (baseValue: number) => number;
  formatPrice: (value: number) => string;
  formatPriceFromBase: (baseValue: number) => string;
  vatPercentage: number;
  vatInclusive: boolean;
  setCurrency: (currency: SupportedCurrency) => void;
}

const CurrencyContext = createContext<CurrencyContextValue | undefined>(undefined);

const BASE_CURRENCY: SupportedCurrency = 'EUR';

const CURRENCY_LS_KEY = 'pa_currency';

const fallbackRates: Record<SupportedCurrency, number> = {
  EUR: 1,
  PLN: 4.5,
  UAH: 40,
  USD: 1.07,
};

export const CurrencyProvider = ({
  children,
  initialCurrency,
  vatPercentage: initialVatPercentage = 0,
  vatInclusive: initialVatInclusive = false,
}: {
  children: React.ReactNode;
  initialCurrency?: SupportedCurrency;
  vatPercentage?: number;
  vatInclusive?: boolean;
}) => {
  const [currencyCode, setCurrencyCode] = useState<SupportedCurrency>(initialCurrency ?? BASE_CURRENCY);
  const [exchangeRate, setExchangeRate] = useState<number>(1);
  const vatPercentage = initialVatPercentage;
  const vatInclusive = initialVatInclusive;

  // On mount: load saved currency preference (user API or localStorage)
  useEffect(() => {
    const loadSavedCurrency = async () => {
      try {
        const { authClient } = await import('@/lib/auth-client');
        const { data } = await authClient.getSession();
        if (data?.user) {
          const res = await fetch('/api/user/currency');
          if (res.ok) {
            const { currency } = await res.json();
            if (currency) setCurrencyCode(currency as SupportedCurrency);
          }
          return;
        }
      } catch {
        // not logged in or error — fall through to localStorage
      }
      const saved = typeof window !== 'undefined' ? localStorage.getItem(CURRENCY_LS_KEY) : null;
      if (saved) setCurrencyCode(saved as SupportedCurrency);
    };
    loadSavedCurrency();
  }, []);

  const setCurrency = useCallback(async (currency: SupportedCurrency) => {
    setCurrencyCode(currency);
    if (typeof window !== 'undefined') {
      localStorage.setItem(CURRENCY_LS_KEY, currency);
    }
    try {
      const { authClient } = await import('@/lib/auth-client');
      const { data } = await authClient.getSession();
      if (data?.user) {
        await fetch('/api/user/currency', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ currency }),
        });
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    let ignore = false;

    const loadRate = async () => {
      if (currencyCode === BASE_CURRENCY) {
        setExchangeRate(1);
        return;
      }

      try {
        const response = await fetch('/api/admin/currency-exchange');
        if (!response.ok) {
          throw new Error('Failed to fetch exchange rates');
        }
        const data = await response.json();
        const match = Array.isArray(data)
          ? data.find((rate: any) => rate.from === BASE_CURRENCY && rate.to === currencyCode)
          : undefined;
        if (!ignore) {
          if (match?.rate && typeof match.rate === 'number') {
            setExchangeRate(match.rate);
          } else {
            setExchangeRate(fallbackRates[currencyCode] ?? 1);
          }
        }
      } catch (error) {
        if (!ignore) {
          setExchangeRate(fallbackRates[currencyCode] ?? 1);
        }
      }
    };

    loadRate();

    return () => {
      ignore = true;
    };
  }, [currencyCode]);

  const vatMultiplier = vatInclusive && vatPercentage > 0 ? 1 + vatPercentage / 100 : 1;

  const convertPrice = useCallback(
    (baseValue: number) => convertPriceValue(baseValue, exchangeRate) * vatMultiplier,
    [exchangeRate, vatMultiplier]
  );

  const formatPrice = useCallback(
    (value: number) => {
      const formatter = new Intl.NumberFormat(getLocaleForCurrency(currencyCode), {
        style: 'currency',
        currency: currencyCode,
      });
      return formatter.format(value);
    },
    [currencyCode]
  );

  const formatPriceFromBase = useCallback(
    (baseValue: number) => formatPrice(convertPrice(baseValue)),
    [convertPrice, formatPrice]
  );

  const contextValue = useMemo(
    () => ({
      baseCurrency: BASE_CURRENCY,
      currencyCode,
      currencySymbol: getCurrencySymbol(currencyCode),
      exchangeRate,
      convertPrice,
      formatPrice,
      formatPriceFromBase,
      vatPercentage,
      vatInclusive,
      setCurrency,
    }),
    [currencyCode, exchangeRate, convertPrice, formatPrice, formatPriceFromBase, vatPercentage, vatInclusive, setCurrency]
  );

  return (
    <CurrencyContext.Provider value={contextValue}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};

export { detectCurrencyFromLocale, convertPriceValue };
