// src/utils/guestUrl.util.ts
export function buildGuestUrl(fullName: string, lastFourDigits: string, weddingId: number, tabIndex?: number): string {
    const base = (process.env.SITE_URL ?? '').replace(/\/$/, '');

    if (!base) {
        throw new Error('SITE_URL environment variable is not configured');
    }

    const params = new URLSearchParams({
        n: fullName,
        p: lastFourDigits,
        w: String(weddingId),
    });

    if (tabIndex !== undefined) {
        params.append('t', String(tabIndex));
    }

    return `${base}/?${params.toString()}`;
}