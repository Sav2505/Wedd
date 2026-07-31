import { useAppSelector } from '../store';

/**
 * Single source of truth for "which wedding is the logged-in user on".
 *
 * Always read the wedding_id via this hook - never via localStorage
 * directly, and never duplicate this logic in individual components.
 * Because it reads from Redux state, it is REACTIVE: if `guest` updates
 * (e.g. after an async login resolves), every component using this hook
 * automatically re-renders / re-fetches with the correct id.
 *
 * Returns `null` when there is no logged-in guest yet.
 */
export function useWeddingId(): number | null {
    return useAppSelector((state) => state.auth.guest?.wedding_id ?? null);
}