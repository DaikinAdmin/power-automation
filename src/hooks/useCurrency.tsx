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
  convertFromCurrency: (price: number, fromCurrency: SupportedCurrency) => number;
  convertToCurrency: (price: number, fromCurrency: SupportedCurrency, toCurrency: SupportedCurrency) => number;
  formatAs: (value: number, currency: SupportedCurrency) => string;
  formatPriceWithCurrency: (price: number, fromCurrency: SupportedCurrency) => string;
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
  const [allRates, setAllRates] = useState<Array<{ from: string; to: string; rate: number }>>([]);
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
            if (currency) {
              setCurrencyCode(currency as SupportedCurrency);
              return;
            }
          }
          // No saved currency for user — fall through to localStorage
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

  // Fetch all rates once on mount
  useEffect(() => {
    let ignore = false;
    const loadAllRates = async () => {
      try {
        const response = await fetch('/api/admin/currency-exchange');
        if (!response.ok) return;
        const data = await response.json();
        if (!ignore && Array.isArray(data)) {
          setAllRates(data);
        }
      } catch {
        // fallbackRates will be used
      }
    };
    loadAllRates();
    return () => { ignore = true; };
  }, []);

  // Derive exchangeRate from allRates + currencyCode
  useEffect(() => {
    if (currencyCode === BASE_CURRENCY) {
      setExchangeRate(1);
      return;
    }
    const match = allRates.find((r) => r.from === BASE_CURRENCY && r.to === currencyCode);
    if (match?.rate && typeof match.rate === 'number') {
      setExchangeRate(match.rate);
    } else {
      setExchangeRate(fallbackRates[currencyCode] ?? 1);
    }
  }, [currencyCode, allRates]);

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

  // Convert a price from any source currency to the user's currency, applying VAT
  const convertFromCurrency = useCallback(
    (price: number, fromCurrency: SupportedCurrency): number => {
      if (fromCurrency === currencyCode) {
        return price * vatMultiplier;
      }
      const fromRate =
        fromCurrency === BASE_CURRENCY
          ? 1
          : (allRates.find((r) => r.from === BASE_CURRENCY && r.to === fromCurrency)?.rate ?? fallbackRates[fromCurrency]);
      const toRate =
        currencyCode === BASE_CURRENCY
          ? 1
          : (allRates.find((r) => r.from === BASE_CURRENCY && r.to === currencyCode)?.rate ?? fallbackRates[currencyCode]);
      return (price / fromRate) * toRate * vatMultiplier;
    },
    [currencyCode, allRates, vatMultiplier]
  );

  const convertToCurrency = useCallback(
    (price: number, fromCurrency: SupportedCurrency, toCurrency: SupportedCurrency): number => {
      const fromRate =
        fromCurrency === BASE_CURRENCY
          ? 1
          : (allRates.find((r) => r.from === BASE_CURRENCY && r.to === fromCurrency)?.rate ?? fallbackRates[fromCurrency]);
      const toRate =
        toCurrency === BASE_CURRENCY
          ? 1
          : (allRates.find((r) => r.from === BASE_CURRENCY && r.to === toCurrency)?.rate ?? fallbackRates[toCurrency]);
      return (price / fromRate) * toRate * vatMultiplier;
    },
    [allRates, vatMultiplier]
  );

  const formatAs = useCallback(
    (value: number, currency: SupportedCurrency): string =>
      new Intl.NumberFormat(getLocaleForCurrency(currency), { style: 'currency', currency }).format(value),
    []
  );

  const formatPriceWithCurrency = useCallback(
    (price: number, fromCurrency: SupportedCurrency) => formatPrice(convertFromCurrency(price, fromCurrency)),
    [convertFromCurrency, formatPrice]
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
      convertFromCurrency,
      convertToCurrency,
      formatAs,
      formatPriceWithCurrency,
      vatPercentage,
      vatInclusive,
      setCurrency,
    }),
    [currencyCode, exchangeRate, convertPrice, formatPrice, formatPriceFromBase, convertFromCurrency, convertToCurrency, formatAs, formatPriceWithCurrency, vatPercentage, vatInclusive, setCurrency]
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
