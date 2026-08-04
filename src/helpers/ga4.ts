/** Reads the GA4 client_id portion of the _ga cookie (e.g. "GA1.1.123.456" -> "123.456"). */
export function getGaClientId(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)_ga=([^;]+)/);
  if (!match) return null;
  const parts = match[1].split(".");
  if (parts.length < 4) return null;
  return `${parts[2]}.${parts[3]}`;
}
