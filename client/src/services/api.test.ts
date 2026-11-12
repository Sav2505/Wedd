import { afterEach, describe, expect, it, vi } from 'vitest';
import api, { setGuestIdProvider } from './api';

describe('guest identity on API requests', () => {
  afterEach(() => {
    setGuestIdProvider(() => undefined);
    vi.unstubAllGlobals();
  });

  it.each([null, JSON.stringify({ id: 'other-guest' })])(
    'uses the current tab identity when shared storage contains %s',
    async (storedGuest) => {
      vi.stubGlobal('localStorage', { getItem: () => storedGuest });
      setGuestIdProvider(() => 'current-guest');

      const response = await api.put('/guests/me/rsvp', {}, {
        adapter: async (config) => ({
          data: null,
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        }),
      });

      expect(response.config.headers.get('X-Guest-ID')).toBe('current-guest');
    },
  );

  it('does not send an identity after logout', async () => {
    setGuestIdProvider(() => undefined);
    const response = await api.get('/guests/me/rsvp', {
      adapter: async (config) => ({ data: null, status: 200, statusText: 'OK', headers: {}, config }),
    });

    expect(response.config.headers.get('X-Guest-ID')).toBeUndefined();
  });
});