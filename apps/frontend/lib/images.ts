/**
 * The sample catalogue stores paths into this app's own `public/` directory, so a
 * fresh clone renders the full grid offline with no CDN account.
 *
 * An absolute https URL is passed through for a real catalogue — but the host has
 * to be listed in next.config.ts `images.remotePatterns` first, or next/image
 * refuses to render it and the card shows an empty box.
 */
const FALLBACK_IMAGE = '/products/glass-500.svg';

export function resolveProductImageUrl(imageUrl: string): string {
  if (!imageUrl) return FALLBACK_IMAGE;
  if (/^https?:\/\//.test(imageUrl)) return imageUrl;
  return imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
}
