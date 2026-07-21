import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { NewShipmentModal } from './components/NewShipmentModal';
import { Sidebar } from './components/Sidebar';

export function App() {
  const [creating, setCreating] = useState(false);
  return (
    <div className="shell">
      <Sidebar />
      <div className="workspace">
        <header className="topbar">
          <span className="tb-title">Shipment Compliance Console</span>
          <span className="tb-sub">demo</span>
          <div className="tb-right">
            <button className="btn" onClick={() => setCreating(true)}>
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
      {creating && <NewShipmentModal onClose={() => setCreating(false)} />}
    </div>
  );
}
