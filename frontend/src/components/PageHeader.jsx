/* eslint-disable react/prop-types */
import Icon from './Icons';
import './PageHeader.css';

export default function PageHeader({ title, subtitle, user, onLogout, onMenuToggle }) {
  return (
    <header className="page-header">
      <button className="mobile-menu-btn" onClick={onMenuToggle} aria-label="Toggle menu">
        <Icon name="menu" size={20} />
      </button>

      <div className="page-header-left">
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>

      <div className="page-header-right">
        <div className="header-user">
          <div className="header-user-avatar">
            <Icon name="user" size={15} color="var(--primary)" />
          </div>
          <div className="header-user-info">
            <span className="header-user-name">{user?.full_name || 'User'}</span>
            <span className="header-user-role">{user?.role || ''}</span>
          </div>
        </div>
        <button className="header-logout-btn" onClick={onLogout} title="Logout">
          <Icon name="logOut" size={16} />
          <span className="header-logout-text">Logout</span>
        </button>
      </div>
    </header>
  );
}
