/**
 * Builds a personalized guest login URL.
 *
 * Format:
 *   https://<site>/?n=<fullName>&p=<last4digits>
 *
 * The base URL is read from VITE_SITE_URL (set in .env.production).
 * Falls back to window.location.origin during development.
 */
export function buildGuestUrl(fullName: string, lastFourDigits: string, weddingid: number): string {
  const base = (import.meta.env.VITE_SITE_URL as string | undefined)?.replace(/\/$/, '')
    ?? window.location.origin;

  const params = new URLSearchParams({ n: fullName, p: lastFourDigits, w: weddingid.toString() });
  return `${base}/?${params.toString()}`;
}

/**
 * Extracts guest credentials from URLSearchParams.
 * Returns null if either param is missing or phone param is not exactly 4 digits.
 */
export function parseGuestParams(
  searchParams: URLSearchParams
): { fullName: string; lastFourDigits: string, weddingId: number } | null {
  const n = searchParams.get('n');
  const p = searchParams.get('p');
  const w = searchParams.get('w');
  if (!n || !p || !/^\d{4}$/.test(p)) return null;
  return { fullName: n, lastFourDigits: p, weddingId: Number(w) };
}
