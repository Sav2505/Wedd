import { RsvpStatus } from '../types/domain';

type AttendanceLike = {
  plus_count?: number | null;
  rsvp_status?: RsvpStatus | null;
  number_of_guests?: number | null;
  effective_party_size?: number | null;
};

function safeInt(value: number | null | undefined, fallback: number): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return fallback;
  return Math.max(0, Math.floor(value));
}

/**
 * How many people will actually show up (for headcount/catering purposes).
 * NOT_COMING always yields 0 here, since nobody from that party is attending.
 */
export function getEffectivePartySize(input: AttendanceLike): number {
  if (input.rsvp_status === 'COMING') {
    const precomputed = safeInt(input.effective_party_size, -1);
    if (precomputed >= 0) return precomputed;
    return Math.max(1, safeInt(input.number_of_guests, 1));
  }

  if (input.rsvp_status === 'NOT_COMING') {
    return 0;
  }

  return 1 + safeInt(input.plus_count, 0);
}

/**
 * How many people are associated with this record regardless of whether
 * they're actually attending. Use this for counting "how many people
 * declined / are pending", as opposed to "how many will show up".
 */
export function getInvitedPartySize(input: AttendanceLike): number {
  if (input.rsvp_status === 'COMING') {
    const precomputed = safeInt(input.effective_party_size, -1);
    if (precomputed >= 0) return precomputed;
    return Math.max(1, safeInt(input.number_of_guests, 1));
  }

  return 1 + safeInt(input.plus_count, 0);
}

export function getEffectivePlusCount(input: AttendanceLike): number {
  return Math.max(0, getEffectivePartySize(input) - 1);
}