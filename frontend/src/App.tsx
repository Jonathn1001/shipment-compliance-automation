import { Outlet } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';

export function App() {
  return (
    <div className="shell">
      <Sidebar />
      <div className="workspace">
        <header className="topbar">
          <span className="tb-title">Shipment Compliance Console</span>
          <span className="tb-sub">read-only · demo</span>
          <div className="tb-right">
            <button className="btn" disabled title="Create flow is not part of this demo">
              + New Shipment
            </button>
            <div className="user">
              <span className="avatar" aria-hidden="true">JD</span>
              <span className="user-meta">
                <b>Jane Doe</b>
                <small>Operations</small>
              </span>
            </div>
          </div>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
