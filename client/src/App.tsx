import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import MainLayout from './pages/MainLayout';
import CoupleLayout from './pages/CoupleLayout';
import { useAppSelector } from './store';
import { parseGuestParams } from './utils/guestUrl';
import WeddingRegisterPage from './pages/WeddingRegisterPage';
import WeddingShowcasePage from './pages/WeddingShowcasePage';
import TermsPage from './pages/legal/TermsPage';
import PrivacyPage from './pages/legal/PrivacyPage';
import ContactPage from './pages/legal/ContactPage';
import DeleteAccountPage from './pages/legal/DeleteAccountPage.tsx';
import RefundPolicyPage from './pages/legal/RefundPolicyPage.tsx';

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
      <Route path="/showcase" element={<WeddingShowcasePage />} />
      <Route path="/register" element={<WeddingRegisterPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/contact" element={<ContactPage />} />
      <Route path="/delete-account" element={<DeleteAccountPage />} />
      <Route path="/refunds" element={<RefundPolicyPage />} />
      <Route
        path="/*"
        element={isAuthenticated && !hasGuestParams ? HomeLayout : <Navigate to={loginRedirect} replace />}
      />
    </Routes>
  );
}
