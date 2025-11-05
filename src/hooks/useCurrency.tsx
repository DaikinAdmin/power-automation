'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { convertPriceValue, detectCurrencyFromLocale, getLocaleForCurrency, SupportedCurrency } from '@/helpers/currency';

interface CurrencyContextValue {
  baseCurrency: SupportedCurrency;
  currencyCode: SupportedCurrency;
  exchangeRate: number;
  convertPrice: (baseValue: number) => number;
  formatPrice: (value: number) => string;
  formatPriceFromBase: (baseValue: number) => string;
}

const CurrencyContext = createContext<CurrencyContextValue | undefined>(undefined);

const BASE_CURRENCY: SupportedCurrency = 'EUR';

const fallbackRates: Record<SupportedCurrency, number> = {
  EUR: 1,
  PLN: 4.5,
  UAH: 40,
};

export const CurrencyProvider = ({ children }: { children: React.ReactNode }) => {
  const [currencyCode, setCurrencyCode] = useState<SupportedCurrency>(BASE_CURRENCY);
  const [exchangeRate, setExchangeRate] = useState<number>(1);

  useEffect(() => {
    const locale = typeof navigator !== 'undefined' ? navigator.language : undefined;
    const detected = detectCurrencyFromLocale(locale);
    setCurrencyCode(detected);
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

  const convertPrice = useCallback((baseValue: number) => convertPriceValue(baseValue, exchangeRate), [exchangeRate]);

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
      exchangeRate,
      convertPrice,
      formatPrice,
      formatPriceFromBase,
    }),
    [currencyCode, exchangeRate, convertPrice, formatPrice, formatPriceFromBase]
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
