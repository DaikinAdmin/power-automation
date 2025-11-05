import { detectCurrencyFromLocale, convertPriceValue, getLocaleForCurrency } from '@/helpers/currency';

describe('currency helpers', () => {
  describe('detectCurrencyFromLocale', () => {
    it('returns PLN for Polish locales', () => {
      expect(detectCurrencyFromLocale('pl-PL')).toBe('PLN');
      expect(detectCurrencyFromLocale('pl')).toBe('PLN');
    });

    it('returns UAH for Ukrainian locales', () => {
      expect(detectCurrencyFromLocale('uk-UA')).toBe('UAH');
      expect(detectCurrencyFromLocale('ua-UA')).toBe('UAH');
    });

    it('falls back to EUR for unknown locales', () => {
      expect(detectCurrencyFromLocale('en-US')).toBe('EUR');
      expect(detectCurrencyFromLocale(undefined)).toBe('EUR');
    });
  });

  describe('convertPriceValue', () => {
    it('multiplies a price by the exchange rate and rounds to two decimals', () => {
      expect(convertPriceValue(100, 4.5)).toBe(450);
      expect(convertPriceValue(99.99, 4.5)).toBeCloseTo(449.96, 2);
    });

    it('returns 0 when the result is not finite', () => {
      expect(convertPriceValue(Number.POSITIVE_INFINITY, 2)).toBe(0);
      expect(convertPriceValue(100, Number.NaN)).toBe(0);
    });
  });

  describe('getLocaleForCurrency', () => {
    it('maps known currencies to locales', () => {
      expect(getLocaleForCurrency('PLN')).toBe('pl-PL');
      expect(getLocaleForCurrency('UAH')).toBe('uk-UA');
      expect(getLocaleForCurrency('EUR')).toBe('en-US');
    });
  });
});
