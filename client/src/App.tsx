import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage    from './pages/LoginPage';
import MainLayout   from './pages/MainLayout';
import CoupleLayout from './pages/CoupleLayout';
import { useAppSelector } from './store';

export default function App() {
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  const role            = useAppSelector((s) => s.auth.guest?.role);

  const HomeLayout = role === 'couple' ? <CoupleLayout /> : <MainLayout />;

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />}
      />
      <Route
        path="/*"
        element={isAuthenticated ? HomeLayout : <Navigate to="/login" replace />}
      />
    </Routes>
  );
}
