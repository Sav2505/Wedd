/**
 * Builds a personalized guest login URL.
 *
 * Format:
 *   https://<site>/?n=<fullName>&p=<last4digits>&w=<weddingId>[&t=<tabIndex>]
 *
 * The base URL is read from VITE_SITE_URL (set in .env.production).
 * Falls back to window.location.origin during development.
 *
 * @param tabIndex Optional tab index to open automatically (0-4)
 */
export function buildGuestUrl(fullName: string, lastFourDigits: string, weddingid: number, tabIndex?: number): string {
  const base = (import.meta.env.VITE_SITE_URL as string | undefined)?.replace(/\/$/, '')
    ?? window.location.origin;

  const params = new URLSearchParams({ n: fullName, p: lastFourDigits, w: String(weddingid) });
  
  if (tabIndex !== undefined) {
    params.append('t', String(tabIndex));
  }
  
  return `${base}/?${params.toString()}`;
}

/**
 * Extracts guest credentials and optional tab index from URLSearchParams.
 * Returns null if either name or phone params are missing or phone param is not exactly 4 digits.
 */
export function parseGuestParams(
  searchParams: URLSearchParams
): { fullName: string; lastFourDigits: string, weddingId: string, tabIndex?: number } | null {
  const n = searchParams.get('n');
  const p = searchParams.get('p');
  const w = searchParams.get('w');
  const t = searchParams.get('t');
  
  if (!n || !p || !/^\d{4}$/.test(p)) return null;
  
  const tabIndex = t ? (Number.isFinite(Number(t)) ? Number(t) : undefined) : undefined;
  
  return { fullName: n, lastFourDigits: p, weddingId: String(w), tabIndex };
}
