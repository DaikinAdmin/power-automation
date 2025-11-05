export const calculateDiscountPercentage = (
  originalPrice: number | string,
  discountPrice: number | string
): number => {
  const toNumber = (value: number | string): number => {
    if (typeof value === 'number') {
      return value;
    }

    const normalized = value
      .replace(/[^0-9.,-]/g, '')
      .replace(/,/g, '.')
      .trim();

    const parsed = parseFloat(normalized);
    return Number.isNaN(parsed) ? 0 : parsed;
  };

  const original = toNumber(originalPrice);
  const discount = toNumber(discountPrice);

  if (original <= 0 || discount <= 0 || discount >= original) {
    return 0;
  }

  return Math.round(((original - discount) / original) * 100);
};
