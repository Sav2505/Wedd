import { configureStore } from '@reduxjs/toolkit';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import authReducer from './authSlice';
import { setGuestIdProvider } from '../services/api';

export const store = configureStore({
  reducer: {
    auth: authReducer,
  },
});

setGuestIdProvider(() => store.getState().auth.guest?.id);

export type RootState   = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
