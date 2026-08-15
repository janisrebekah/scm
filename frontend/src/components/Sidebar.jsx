/* eslint-disable react/prop-types */
import Icon from './Icons';
import './Sidebar.css';

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { id: 'simulator', label: 'Inventory Simulator', icon: 'zap' },
  { id: 'inventory', label: 'Inventory Overview', icon: 'package' },
  { id: 'alerts', label: 'Alerts', icon: 'bell' },
  { id: 'reorder', label: 'Reorder Management', icon: 'refreshCw' },
  { id: 'suppliers', label: 'Suppliers', icon: 'truck' },
];

export default function Sidebar({
  activePage,
  onNavigate,
  alertCount = 0,
  reorderCount = 0,
  sidebarOpen,
  onToggleSidebar,
}) {
  return (
    <>
      {sidebarOpen && (
        <div className="sidebar-backdrop" onClick={onToggleSidebar} />
      )}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        {/* Logo */}
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="logo-icon">
              <Icon name="layers" size={20} color="#fff" />
            </div>
            <div className="logo-text">
              <span className="logo-title">Smart Restock</span>
              <span className="logo-subtitle">Inventory Intelligence</span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          <div className="nav-section-label">MAIN MENU</div>
          {navItems.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${activePage === item.id ? 'active' : ''}`}
              onClick={() => {
                onNavigate(item.id);
                if (sidebarOpen) onToggleSidebar();
              }}
            >
              <div className="nav-icon-wrap">
                <Icon name={item.icon} size={18} />
              </div>
              <span className="nav-label">{item.label}</span>
              {item.id === 'alerts' && alertCount > 0 && (
                <span className="nav-badge nav-badge-danger">{alertCount}</span>
              )}
              {item.id === 'reorder' && reorderCount > 0 && (
                <span className="nav-badge nav-badge-warning">{reorderCount}</span>
              )}
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          <div className="sidebar-footer-text">
            <Icon name="shieldCheck" size={14} />
            <span>v1.0 — Production</span>
          </div>
        </div>
      </aside>
    </>
  );
}
