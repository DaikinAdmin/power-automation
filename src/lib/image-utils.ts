/**
 * Image URL utility.
 *
 * All product / upload images are hosted on the PL domain (powerautomation.pl).
 * Both domains load and upload images from/to that single origin.
 *
 * Override with NEXT_PUBLIC_IMAGE_BASE_URL env variable if needed.
 */

const IMAGE_BASE_URL =
  process.env.NEXT_PUBLIC_IMAGE_BASE_URL || 'https://powerautomation.pl';

/**
 * Convert a relative image path to an absolute URL pointing to the image host.
 * Already-absolute URLs are returned unchanged.
 */
export function toAbsoluteImageUrl(src: string): string {
  if (!src) return src;
  if (src.startsWith('http://') || src.startsWith('https://')) return src;
  return `${IMAGE_BASE_URL}${src.startsWith('/') ? '' : '/'}${src}`;
}
