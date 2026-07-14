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

export const roundToCents = (value: number): number => Math.round(value * 100) / 100;

/**
 * Discount % with cent-level precision, for the bidirectional price/discount
 * editors in admin (product settings, bulk upload). Distinct from
 * calculateDiscountPercentage above, which rounds to a whole percent for
 * customer-facing "-XX%" badges.
 */
export const getEditableDiscountPercent = (
  price: number,
  promotionPrice: number | null | undefined
): number | null => {
  if (
    promotionPrice == null ||
    price <= 0 ||
    promotionPrice <= 0 ||
    promotionPrice >= price
  ) {
    return null;
  }

  return roundToCents(((price - promotionPrice) / price) * 100);
};

/** Inverse of getEditableDiscountPercent: turns a % back into a sale price. */
export const priceFromDiscountPercent = (
  price: number,
  discountPercent: number | null | undefined
): number | null => {
  if (discountPercent == null || discountPercent <= 0 || price <= 0) {
    return null;
  }

  const clamped = Math.min(discountPercent, 99.99);
  return roundToCents(price * (1 - clamped / 100));
};

/**
 * A promo is active when `now` falls within [promoStartDate, promoEndDate].
 * Either bound may be null/absent, meaning that side is unbounded.
 */
export const isPromoActive = (
  promoStartDate: string | Date | null | undefined,
  promoEndDate: string | Date | null | undefined,
  now: Date = new Date()
): boolean => {
  if (promoStartDate && now < new Date(promoStartDate)) {
    return false;
  }

  if (promoEndDate && now > new Date(promoEndDate)) {
    return false;
  }

  return true;
};
