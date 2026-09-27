import { NavLink, Outlet } from 'react-router-dom';
import Icon from '../Icon.jsx';

const NAV = [
  { to: '/', label: 'Dashboard', icon: 'dashboard', end: true, bottom: true },
  { to: '/transactions', label: 'Transactions', icon: 'list', bottom: true },
  { to: '/receive', label: 'Receive', icon: 'receive', bottom: true },
  { to: '/pay', label: 'Pay', icon: 'pay', bottom: true },
  { to: '/reports', label: 'Reports', icon: 'chart', bottom: true },
  { to: '/people', label: 'People', icon: 'users', bottom: false },
  { to: '/settings', label: 'Settings', icon: 'settings', bottom: true },
];

function NavItem({ item }) {
  return (
    <NavLink to={item.to} end={item.end} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
      <Icon name={item.icon} size={20} />
      <span className="nav-label">{item.label}</span>
    </NavLink>
  );
}

export default function AppLayout() {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">₹</span>
          <span>Expense Tracker</span>
        </div>
        <nav className="side-nav">
          {NAV.map((item) => (
            <NavItem key={item.to} item={item} />
          ))}
        </nav>
      </aside>
      <main className="main">
        <Outlet />
      </main>
      <nav className="bottom-nav">
        {NAV.filter((i) => i.bottom).map((item) => (
          <NavItem key={item.to} item={item} />
        ))}
      </nav>
    </div>
  );
}