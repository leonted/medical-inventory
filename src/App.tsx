import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './hooks/useAuth';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ItemsPage from './pages/ItemsPage';
import TransactionsPage from './pages/TransactionsPage';
import StocktakePage from './pages/StocktakePage';
import MasterPage from './pages/MasterPage';
import ScanPage from './pages/ScanPage';
import HistoryPage from './pages/HistoryPage';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">読み込み中...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/scan/:id" element={<ScanPage />} />
        <Route path="/" element={<RequireAuth><Layout /></RequireAuth>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="items" element={<ItemsPage />} />
          <Route path="transactions" element={<TransactionsPage />} />
          <Route path="history" element={<HistoryPage />} />
          <Route path="stocktake" element={<StocktakePage />} />
          <Route path="master" element={<MasterPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
