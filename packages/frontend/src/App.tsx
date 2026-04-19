import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import { usersApi } from './api';
import AppShell from './components/layout/AppShell';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import TransactionsPage from './pages/transactions/TransactionsPage';
import SavingsPage from './pages/savings/SavingsPage';
import InvestmentsPage from './pages/investments/InvestmentsPage';
import BudgetsPage from './pages/budgets/BudgetsPage';
import AnalyticsPage from './pages/analytics/AnalyticsPage';
import FamilyPage from './pages/family/FamilyPage';
import MorePage from './pages/more/MorePage';
import { PageLoader } from './components/common/LoadingSpinner';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token, user } = useAuthStore();
  if (!token) return <Navigate to="/login" replace />;
  if (!user) return <PageLoader />;
  return <>{children}</>;
}

export default function App() {
  const { token, setAuth, updateUser } = useAuthStore();
  const [bootstrapped, setBootstrapped] = useState(false);

  useEffect(() => {
    if (token) {
      usersApi.me().then(({ data }) => {
        updateUser(data);
      }).catch(() => {
        // token expired — interceptor will redirect
      }).finally(() => setBootstrapped(true));
    } else {
      setBootstrapped(true);
    }
  }, []);

  if (!bootstrapped) return (
    <div className="min-h-screen flex items-center justify-center">
      <PageLoader />
    </div>
  );

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/" element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
          <Route index element={<DashboardPage />} />
          <Route path="transactions" element={<TransactionsPage />} />
          <Route path="savings" element={<SavingsPage />} />
          <Route path="investments" element={<InvestmentsPage />} />
          <Route path="budgets" element={<BudgetsPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="family" element={<FamilyPage />} />
          <Route path="more" element={<MorePage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
