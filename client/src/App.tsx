import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import MainLayout from './pages/MainLayout';
import CoupleLayout from './pages/CoupleLayout';
import { useAppSelector } from './store';
import { parseGuestParams } from './utils/guestUrl';
import WeddingRegisterPage from './pages/WeddingRegisterPage';
import WeddingShowcasePage from './pages/WeddingShowcasePage';

export default function App() {
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  const role = useAppSelector((s) => s.auth.guest?.role);
  const location = useLocation();

  const HomeLayout = role === 'couple' ? <CoupleLayout /> : <MainLayout />;

  // When a guest link has params, route through login even if already authenticated.
  const hasGuestParams = Boolean(parseGuestParams(new URLSearchParams(location.search)));
  const loginRedirect = `/login${location.search}`;

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated && !hasGuestParams ? <Navigate to="/" replace /> : <LoginPage />}
      />
      <Route
        path="/*"
        element={isAuthenticated && !hasGuestParams ? HomeLayout : <Navigate to={loginRedirect} replace />}
      />
      <Route path="/showcase" element={<WeddingShowcasePage />} />
      <Route path="/register" element={<WeddingRegisterPage />} />
    </Routes>
  );
}
