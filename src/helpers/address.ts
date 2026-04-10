export interface AddressFields {
  country: string;
  city: string;
  street: string;
  postalCode: string;
}

const SEPARATOR = "|";

/**
 * Encodes address fields into a single string stored in user.address_line.
 * Format: "country|city|street|postalCode"
 */
export function formatAddress(fields: Partial<AddressFields>): string {
  return [
    (fields.country ?? "").trim(),
    (fields.city ?? "").trim(),
    (fields.street ?? "").trim(),
    (fields.postalCode ?? "").trim(),
  ].join(SEPARATOR);
}

/**
 * Parses a user.address_line string back into structured fields.
 * Safe to call on empty / null / legacy plain-text values.
 */
export function parseAddress(addressLine: string | null | undefined): AddressFields {
  if (!addressLine) {
    return { country: "", city: "", street: "", postalCode: "" };
  }

  const parts = addressLine.split(SEPARATOR);
  return {
    country: parts[0]?.trim() ?? "",
    city: parts[1]?.trim() ?? "",
    street: parts[2]?.trim() ?? "",
    postalCode: parts[3]?.trim() ?? "",
  };
}

/**
 * Returns a human-readable single-line address string.
 * E.g. "вул. Франка 12, Львів 79000, Польща"
 */
export function displayAddress(addressLine: string | null | undefined): string {
  const { country, city, street, postalCode } = parseAddress(addressLine);
  const parts = [street, city, postalCode, country].filter(Boolean);
  return parts.join(", ");
}
