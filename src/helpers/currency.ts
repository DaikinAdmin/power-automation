export type SupportedCurrency = 'EUR' | 'PLN' | 'UAH';

const localeCurrencyMap: Record<SupportedCurrency, string> = {
  EUR: 'en-US',
  PLN: 'pl-PL',
  UAH: 'uk-UA',
};

export const detectCurrencyFromLocale = (locale?: string): SupportedCurrency => {
  if (!locale) {
    if (typeof navigator !== 'undefined') {
      locale = navigator.language;
    } else {
      return 'EUR';
    }
  }

  const normalized = locale.toLowerCase();
  if (normalized.includes('pl')) {
    return 'PLN';
  }
  if (normalized.includes('ua') || normalized.includes('uk')) {
    return 'UAH';
  }
  return 'EUR';
};

export const getLocaleForCurrency = (currency: SupportedCurrency): string => {
  return localeCurrencyMap[currency] ?? localeCurrencyMap.EUR;
};

export const getCurrencySymbol = (currency: SupportedCurrency): string => {
  const symbolMap: Record<SupportedCurrency, string> = {
    EUR: '€',
    PLN: 'zł',
    UAH: '₴',
  };
  return symbolMap[currency] ?? '€';
};

export const convertPriceValue = (value: number, exchangeRate: number): number => {
  const converted = value * exchangeRate;
  if (!Number.isFinite(converted)) {
    return 0;
  }

  const rounded = Math.round((converted + Number.EPSILON) * 100) / 100;
  return Number.isFinite(rounded) ? rounded : 0;
};

export const parsePriceString = (input: number | string | null | undefined): number => {
  if (typeof input === 'number') {
    return Number.isFinite(input) ? input : 0;
  }

  if (input === null || input === undefined) {
    return 0;
  }

  const normalized = String(input).replace(/[^0-9.,-]/g, '').replace(',', '.');
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};
