export function toSafeExternalUrl(raw: string | null | undefined): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null;
  } catch {
    if (/^[a-z][a-z\d+.-]*:/i.test(trimmed)) return null;
    try {
      return new URL(`https://${trimmed}`).toString();
    } catch {
      return null;
    }
  }
}