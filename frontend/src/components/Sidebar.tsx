import { NavLink } from 'react-router-dom';

/**
 * Left rail. Dashboard and Shipments are live routes; the remaining items echo
 * the product's planned surface but are not built yet, so they are rendered
 * disabled rather than as dead links.
 */

const LIVE = [
  { to: '/', label: 'Dashboard', end: true, icon: '▤' },
  { to: '/shipments', label: 'Shipments', end: false, icon: '▦' },
];

const SOON = ['Documents', 'Validations', 'Reports', 'Audit Log', 'Settings'];

export function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brand-mark">◇</span>
        <span className="brand-name">SCA</span>
      </div>
      <nav className="nav">
        {LIVE.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            <span className="nav-icon" aria-hidden="true">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
        {SOON.map((label) => (
          <span key={label} className="nav-item soon" aria-disabled="true">
            <span className="nav-icon" aria-hidden="true">◦</span>
            {label}
            <span className="soon-tag">soon</span>
          </span>
        ))}
      </nav>
    </aside>
  );
}
