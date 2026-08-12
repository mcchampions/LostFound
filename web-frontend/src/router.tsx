import { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import LoadingSkeleton from './components/LoadingSkeleton';

const Home = lazy(() => import('./pages/Home'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const LostItemList = lazy(() => import('./pages/LostItemList'));
const LostItemDetail = lazy(() => import('./pages/LostItemDetail'));
const LostItemForm = lazy(() => import('./pages/LostItemForm'));
const FoundItemList = lazy(() => import('./pages/FoundItemList'));
const FoundItemDetail = lazy(() => import('./pages/FoundItemDetail'));
const FoundItemForm = lazy(() => import('./pages/FoundItemForm'));
const Notifications = lazy(() => import('./pages/Notifications'));
const Profile = lazy(() => import('./pages/Profile'));
const UserProfile = lazy(() => import('./pages/UserProfile'));
const Claims = lazy(() => import('./pages/Claims'));
const Chat = lazy(() => import('./pages/Chat'));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'));
const AdminCategories = lazy(() => import('./pages/admin/AdminCategories'));
const AdminStats = lazy(() => import('./pages/admin/AdminStats'));
const AdminLogs = lazy(() => import('./pages/admin/AdminLogs'));
const AdminAnnouncements = lazy(() => import('./pages/admin/AdminAnnouncements'));
const AdminTrash = lazy(() => import('./pages/admin/AdminTrash'));
const AdminLogin = lazy(() => import('./pages/AdminLogin'));
const NotFound = lazy(() => import('./pages/NotFound'));

const page = (node: React.ReactNode) => (
  <Suspense
    fallback={<LoadingSkeleton />}
  >
    {node}
  </Suspense>
);

const router = createBrowserRouter([
  {
    path: '/', element: <Layout />,
    children: [
      { index: true, element: page(<Home />) },
      { path: 'login', element: page(<Login />) },
      { path: 'register', element: page(<Register />) },
      { path: 'forgot-password', element: page(<ForgotPassword />) },
      { path: 'lost-items', element: page(<LostItemList />) },
      { path: 'lost-items/:id', element: page(<LostItemDetail />) },
      { path: 'lost-items/create', element: page(<ProtectedRoute><LostItemForm /></ProtectedRoute>) },
      { path: 'lost-items/:id/edit', element: page(<ProtectedRoute><LostItemForm /></ProtectedRoute>) },
      { path: 'found-items', element: page(<FoundItemList />) },
      { path: 'found-items/:id', element: page(<FoundItemDetail />) },
      { path: 'found-items/create', element: page(<ProtectedRoute><FoundItemForm /></ProtectedRoute>) },
      { path: 'found-items/:id/edit', element: page(<ProtectedRoute><FoundItemForm /></ProtectedRoute>) },
      { path: 'notifications', element: page(<ProtectedRoute><Notifications /></ProtectedRoute>) },
      { path: 'profile', element: page(<ProtectedRoute><Profile /></ProtectedRoute>) },
      { path: 'claims', element: page(<ProtectedRoute><Claims /></ProtectedRoute>) },
      { path: 'chat', element: page(<ProtectedRoute><Chat /></ProtectedRoute>) },
      { path: 'users/:id', element: page(<UserProfile />) },
      { path: 'admin/users', element: page(<ProtectedRoute adminOnly><AdminUsers /></ProtectedRoute>) },
      { path: 'admin/categories', element: page(<ProtectedRoute adminOnly><AdminCategories /></ProtectedRoute>) },
      { path: 'admin/stats', element: page(<ProtectedRoute adminOnly><AdminStats /></ProtectedRoute>) },
      { path: 'login/admin', element: page(<AdminLogin />) },
      { path: 'admin/logs', element: page(<ProtectedRoute adminOnly><AdminLogs /></ProtectedRoute>) },
      { path: 'admin/announcements', element: page(<ProtectedRoute adminOnly><AdminAnnouncements /></ProtectedRoute>) },
      { path: 'admin/trash', element: page(<ProtectedRoute adminOnly><AdminTrash /></ProtectedRoute>) },
      { path: '*', element: page(<NotFound />) },
    ],
  },
]);

export default router;
