import AdminLayout from '../components/layouts/admin/AdminLayout';
import NotFound from '../components/NotFound';
import Admin from '../pages/admin/Admin';
import AdminSettings from '../pages/admin/AdminSettings';
import Dashboard from '../pages/admin/Dashboard';
import Shops from '../pages/admin/Shops';
import ShopDetail from '../pages/admin/ShopDetail';
import AuditLog from '../pages/admin/AuditLog';
import Plans from '../pages/admin/Plans';
import ProtectedRoute from './guards/ProtectedRoute';

export const adminRoutes = [
    {
        path: '/dashboard',
        element: <ProtectedRoute />,
        children: [
            {
                element: <AdminLayout />,
                children: [
                    { index: true,             element: <Dashboard /> },
                    { path: 'shops',           element: <Shops /> },
                    { path: 'shops/:id',       element: <ShopDetail /> },
                    { path: 'plans',           element: <Plans /> },
                    { path: 'audit',           element: <AuditLog /> },
                    { path: 'admins',          element: <Admin /> },
                    { path: 'settings',        element: <AdminSettings /> },
                    { path: '*',               element: <NotFound /> },
                ],
            },
        ],
    },
];