import type { UnassignedGuest } from '../types/domain';

export interface SeatingGuestGroup {
    id: string | null;
    name: string;
}

export function getSeatingGuestGroups(
    guests: UnassignedGuest[],
    selectedGroup: SeatingGuestGroup | null = null,
): SeatingGuestGroup[] {
    const groups = new Map<string | null, SeatingGuestGroup>();
    for (const guest of guests) {
        const id = guest.guest_group_id ?? null;
        groups.set(id, { id, name: guest.group_name || 'ללא קבוצה' });
    }
    if (selectedGroup && !groups.has(selectedGroup.id)) {
        groups.set(selectedGroup.id, selectedGroup);
    }
    return [...groups.values()].sort((first, second) => first.name.localeCompare(second.name, 'he'));
}

export function filterSeatingGuests(
    guests: UnassignedGuest[],
    group: SeatingGuestGroup | null,
    confirmedOnly = false,
): UnassignedGuest[] {
    return guests.filter(guest =>
        (!group || (guest.guest_group_id ?? null) === group.id)
        && (!confirmedOnly || guest.rsvp_status === 'COMING')
    );
}