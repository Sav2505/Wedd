import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Guest } from '../types/domain';

interface AuthState {
  guest: Guest | null;
  isAuthenticated: boolean;
}

const stored = sessionStorage.getItem('wedding_guest');
const initialState: AuthState = {
  guest: stored ? (JSON.parse(stored) as Guest) : null,
  isAuthenticated: Boolean(stored),
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setGuest(state, action: PayloadAction<Guest>) {
      state.guest = action.payload;
      state.isAuthenticated = true;
      sessionStorage.setItem('wedding_guest', JSON.stringify(action.payload));
    },
    logout(state) {
      state.guest = null;
      state.isAuthenticated = false;
      sessionStorage.removeItem('wedding_guest');
    },
  },
});

export const { setGuest, logout } = authSlice.actions;
export default authSlice.reducer;
