import { useState, useEffect, useCallback } from 'react';
import { fetchDashboardSummary } from './api';
import './App.css';

/* Components */
import Sidebar from './components/Sidebar';
import PageHeader from './components/PageHeader';

/* Pages */
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import Simulator from './pages/Simulator';
import InventoryOverview from './pages/InventoryOverview';
import ReorderManagement from './pages/ReorderManagement';
import AlertsHistory from './pages/AlertsHistory';
import Suppliers from './pages/Suppliers';

/* ── Page metadata ─────────────────────────────────────── */
const PAGE_META = {
  dashboard:  { title: 'Dashboard',            subtitle: 'Real-time inventory command center' },
  simulator:  { title: 'Inventory Simulator',   subtitle: 'Simulate transactions and observe live effects' },
  inventory:  { title: 'Inventory Overview',     subtitle: 'Browse and filter all products' },
  alerts:     { title: 'Alerts',                 subtitle: 'Complete alert history and resolution status' },
  reorder:    { title: 'Reorder Management',     subtitle: 'Manage reorder recommendations' },
  suppliers:  { title: 'Suppliers',              subtitle: 'Manage supplier information and supplied products' },
};

/* ── App Shell ─────────────────────────────────────────── */
function App() {
  /* Auth state */
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  /* Data state */
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /* Navigation state */
  const [activePage, setActivePage] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  /* ── Load dashboard data ─────────────────────────────── */
  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await fetchDashboardSummary();
      setData(result);
    } catch (err) {
      setError(err.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  /* ── Check existing JWT session on mount ─────────────── */
  useEffect(() => {
    async function checkAuth() {
      const token = localStorage.getItem('access_token');
      if (!token) {
        setAuthLoading(false);
        return;
      }
      try {
        const response = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
          localStorage.removeItem('access_token');
          localStorage.removeItem('user');
          setUser(null);
          return;
        }
        const currentUser = await response.json();
        setUser(currentUser);
        localStorage.setItem('user', JSON.stringify(currentUser));
      } catch {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
        setUser(null);
      } finally {
        setAuthLoading(false);
      }
    }
    checkAuth();
  }, []);

  /* ── Fetch data once authenticated ───────────────────── */
  useEffect(() => {
    if (user) loadDashboard();
  }, [user, loadDashboard]);

  /* ── Handlers ────────────────────────────────────────── */
  const handleLogin = (currentUser) => setUser(currentUser);

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    setUser(null);
    setData(null);
    setError(null);
    setActivePage('dashboard');
  };

  const handleNavigate = (page) => setActivePage(page);
  const toggleSidebar = () => setSidebarOpen(prev => !prev);

  /* ── Auth loading ────────────────────────────────────── */
  if (authLoading) {
    return (
      <div className="app-loading-screen">
        <div className="app-spinner" />
        <p>Checking authentication...</p>
      </div>
    );
  }

  /* ── Login screen ────────────────────────────────────── */
  if (!user) {
    return <LoginPage onLogin={handleLogin} />;
  }

  /* ── Data loading ────────────────────────────────────── */
  if (loading && !data) {
    return (
      <div className="app-loading-screen">
        <div className="app-spinner" />
        <p>Loading dashboard data...</p>
      </div>
    );
  }

  /* ── Error state ─────────────────────────────────────── */
  if (error && !data) {
    return (
      <div className="app-loading-screen">
        <p className="app-error-msg">{error}</p>
        <button className="app-retry-btn" onClick={loadDashboard}>Retry</button>
      </div>
    );
  }

  if (!data) return null;

  /* ── Derived counts for sidebar badges ───────────────── */
  const alertBadgeSource = data.alert_history?.length ? data.alert_history : (data.active_alerts || []);
  const alertCount = alertBadgeSource
    .filter(alert => alert.status === 'ACTIVE').length;
  const reorderCount = data.reorder_summary?.pending_reorders || 0;

  const pageMeta = PAGE_META[activePage] || PAGE_META.dashboard;

  /* ── Render page content ─────────────────────────────── */
  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return <Dashboard data={data} />;
      case 'simulator':
        return <Simulator products={data.products} onRefresh={loadDashboard} />;
      case 'inventory':
        return <InventoryOverview products={data.products} onRefresh={loadDashboard} />;
      case 'alerts':
        return <AlertsHistory history={data.alert_history} />;
      case 'reorder':
        return (
          <ReorderManagement
            reorders={data.reorder_recommendations}
            reorderSummary={data.reorder_summary}
            onRefresh={loadDashboard}
          />
        );
      case 'suppliers':
        return <Suppliers />;
      default:
        return <Dashboard data={data} />;
    }
  };

  return (
    <div className="app-shell">
      <Sidebar
        activePage={activePage}
        onNavigate={handleNavigate}
        alertCount={alertCount}
        reorderCount={reorderCount}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={toggleSidebar}
      />

      <div className="app-main">
        <PageHeader
          title={pageMeta.title}
          subtitle={pageMeta.subtitle}
          user={user}
          onLogout={handleLogout}
          onMenuToggle={toggleSidebar}
        />

        <main className="app-content">
          {renderPage()}
        </main>
      </div>
    </div>
  );
}

export default App;
