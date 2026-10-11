import { describe, expect, it } from 'vitest';
import type { UnassignedGuest } from '../types/domain';
import { filterSeatingGuests, getSeatingGuestGroups } from './seatingGuestGroups';

const guests: UnassignedGuest[] = [
    { id: '1', full_name: 'אורח ראשון', side: null, plus_count: 0, guest_group_id: 'family', group_name: 'משפחה', rsvp_status: 'COMING' },
    { id: '2', full_name: 'אורח שני', side: null, plus_count: 2, guest_group_id: 'family', group_name: 'משפחה', rsvp_status: 'PENDING' },
    { id: '3', full_name: 'אורח שלישי', side: null, plus_count: 0, guest_group_id: 'friends', group_name: 'חברים', rsvp_status: 'COMING' },
    { id: '4', full_name: 'אורח רביעי', side: null, plus_count: 0, guest_group_id: null, group_name: null, rsvp_status: 'NOT_COMING' },
];
const family = { id: 'family', name: 'משפחה' };

describe('seating guest group selection', () => {
    it('shows all unassigned guests without a group filter', () => {
        expect(filterSeatingGuests(guests, null)).toEqual(guests);
    });

    it('filters both the full list and confirmed list by group ID', () => {
        expect(filterSeatingGuests(guests, family).map(guest => guest.id)).toEqual(['1', '2']);
        expect(filterSeatingGuests(guests, family, true).map(guest => guest.id)).toEqual(['1']);
        expect(filterSeatingGuests(guests, null, true).map(guest => guest.id)).toEqual(['1', '3']);
    });

    it('distinguishes no group from all groups', () => {
        expect(filterSeatingGuests(guests, { id: null, name: 'ללא קבוצה' }).map(guest => guest.id)).toEqual(['4']);
    });

    it('deduplicates and sorts available groups', () => {
        expect(getSeatingGuestGroups(guests)).toEqual([
            { id: 'friends', name: 'חברים' },
            { id: null, name: 'ללא קבוצה' },
            family,
        ]);
    });

    it('keeps the selected group after its last guest is assigned', () => {
        const remaining = guests.filter(guest => guest.guest_group_id !== 'family');
        expect(getSeatingGuestGroups(remaining, family)).toContainEqual(family);
        expect(filterSeatingGuests(remaining, family)).toEqual([]);
    });

    it('does not mix groups with identical names', () => {
        const otherGuest = { ...guests[0], id: '5', guest_group_id: 'other-family' };
        expect(filterSeatingGuests([...guests, otherGuest], family).map(guest => guest.id)).toEqual(['1', '2']);
    });
});