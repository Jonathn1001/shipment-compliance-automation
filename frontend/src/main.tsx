import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { App } from './App';
import { ShipmentDetail } from './pages/ShipmentDetail';
import { ShipmentList } from './pages/ShipmentList';
import './styles.css';

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <ShipmentList /> },
      { path: 'shipments/:id', element: <ShipmentDetail /> },
    ],
  },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
