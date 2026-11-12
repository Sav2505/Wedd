import { afterEach, describe, expect, it, vi } from 'vitest';

function storage(initial: string | null = null) {
  let value = initial;
  return {
    getItem: () => value,
    setItem: (_key: string, next: string) => { value = next; },
    removeItem: () => { value = null; },
  };
}

describe('guest identity persistence', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('restores the current tab identity instead of another tab identity', async () => {
    vi.stubGlobal('sessionStorage', storage(JSON.stringify({ id: 'current-guest' })));
    vi.stubGlobal('localStorage', storage(JSON.stringify({ id: 'other-guest' })));
    const { default: reducer } = await import('./authSlice');

    expect(reducer(undefined, { type: 'init' }).guest?.id).toBe('current-guest');
  });

  it('restores an existing login from local storage when the tab has no identity', async () => {
    vi.stubGlobal('sessionStorage', storage());
    vi.stubGlobal('localStorage', storage(JSON.stringify({ id: 'existing-guest' })));
    const { default: reducer } = await import('./authSlice');

    expect(reducer(undefined, { type: 'init' }).guest?.id).toBe('existing-guest');
  });

  it('keeps the identity in memory when storage access fails', async () => {
    const blockedStorage = {
      getItem: () => { throw new Error('blocked'); },
      setItem: () => { throw new Error('blocked'); },
      removeItem: () => { throw new Error('blocked'); },
    };
    vi.stubGlobal('sessionStorage', blockedStorage);
    vi.stubGlobal('localStorage', blockedStorage);
    const { default: reducer, setGuest, logout } = await import('./authSlice');
    const guest = { id: 'current-guest' } as Parameters<typeof setGuest>[0];

    const loggedIn = reducer(undefined, setGuest(guest));
    expect(loggedIn.guest?.id).toBe('current-guest');
    expect(reducer(loggedIn, logout()).guest).toBeNull();
  });
});