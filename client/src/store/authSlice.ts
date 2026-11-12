import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Guest } from '../types/domain';

interface AuthState {
  guest: Guest | null;
  isAuthenticated: boolean;
}

function readGuest(getStorage: () => Storage): Guest | null {
  try {
    const raw = getStorage().getItem('wedding_guest');
    if (!raw) return null;
    const guest = JSON.parse(raw) as Guest;
    return guest && typeof guest.id === 'string' && guest.id ? guest : null;
  } catch {
    return null;
  }
}

function loadGuest(): Guest | null {
  return readGuest(() => sessionStorage) ?? readGuest(() => localStorage);
}

function persistGuest(guest: Guest | null): void {
  for (const getStorage of [() => sessionStorage, () => localStorage]) {
    try {
      const storage = getStorage();
      if (guest) storage.setItem('wedding_guest', JSON.stringify(guest));
      else storage.removeItem('wedding_guest');
    } catch {
      continue;
    }
  }
}

const stored = loadGuest();
const initialState: AuthState = {
  guest: stored,
  isAuthenticated: Boolean(stored),
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setGuest(state, action: PayloadAction<Guest>) {
      state.guest = action.payload;
      state.isAuthenticated = true;
      persistGuest(action.payload);
    },
    logout(state) {
      state.guest = null;
      state.isAuthenticated = false;
      persistGuest(null);
    },
  },
});

export const { setGuest, logout } = authSlice.actions;
export default authSlice.reducer;
