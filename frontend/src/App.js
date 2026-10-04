import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { StoreProvider } from '@/contexts/StoreContext';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import TicketsPage from '@/pages/TicketsPage';
import NewTicket from '@/pages/NewTicket';
import Customers from '@/pages/Customers';
import Warehouse from '@/pages/Warehouse';
import POS from '@/pages/POS';
import SettingsPage from '@/pages/SettingsPage';
import Reports from '@/pages/Reports';
import Tracking from '@/pages/Tracking';
import Layout from '@/components/Layout';
import '@/App.css';

function Protected({ children, adminOnly = false }) {
  // BYPASS TOTALE LOGIN: Entriamo diretti senza blocchi
  return children;
}

function PublicRouter() {
  const q = new URLSearchParams(useLocation().search);
  const trackCode = q.get('track');
  if (trackCode) return <Tracking code={trackCode} />;
  return null;
}

function AppRoutes() {
  const q = new URLSearchParams(window.location.search);
  if (q.get('track')) return <Tracking code={q.get('track')} />;
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/track/:code" element={<TrackRouter />} />
      <Route
        path="/"
        element={
          <Protected>
            <Layout />
          </Protected>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="tickets" element={<TicketsPage />} />
        <Route path="tickets/new" element={<NewTicket />} />
        <Route path="customers" element={<Customers />} />
        <Route path="warehouse" element={<Warehouse />} />
        <Route path="pos" element={<POS />} />
        <Route path="reports" element={<Reports />} />
        <Route
          path="settings"
          element={
            <Protected adminOnly>
              <SettingsPage />
            </Protected>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function TrackRouter() {
  const parts = window.location.pathname.split('/');
  const code = parts[parts.length - 1];
  return <Tracking code={code} />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <StoreProvider>
          <AppRoutes />
          <Toaster
            theme="dark"
            position="top-right"
            toastOptions={{
              style: {
                background: '#0f172a',
                border: '1px solid #06b6d4',
                color: '#f8fafc',
              },
            }}
          />
        </StoreProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}