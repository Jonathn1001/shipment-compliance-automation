import { Link, Outlet } from 'react-router-dom';

export function App() {
  return (
    <>
      <header className="app-header">
        <Link to="/" className="mark">
          ◇ SCA
        </Link>
        <span className="title">Shipment Compliance Console</span>
        <span className="sub">read-only · demo</span>
      </header>
      <main className="container">
        <Outlet />
      </main>
    </>
  );
}
