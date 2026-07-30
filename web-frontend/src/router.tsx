import { createBrowserRouter } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import LostItemList from './pages/LostItemList';
import LostItemDetail from './pages/LostItemDetail';
import LostItemForm from './pages/LostItemForm';
import FoundItemList from './pages/FoundItemList';
import FoundItemDetail from './pages/FoundItemDetail';
import FoundItemForm from './pages/FoundItemForm';
import Notifications from './pages/Notifications';
import Profile from './pages/Profile';
import UserProfile from './pages/UserProfile';
import Claims from './pages/Claims';
import Chat from './pages/Chat';
import AdminUsers from './pages/admin/AdminUsers';
import AdminCategories from './pages/admin/AdminCategories';
import AdminStats from './pages/admin/AdminStats';
import AdminLogs from './pages/admin/AdminLogs';
import AdminLogin from './pages/AdminLogin';
import ProtectedRoute from './components/ProtectedRoute';
import NotFound from './pages/NotFound';

const router = createBrowserRouter([
  {
    path: '/', element: <Layout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'login', element: <Login /> },
      { path: 'register', element: <Register /> },
      { path: 'lost-items', element: <LostItemList /> },
      { path: 'lost-items/:id', element: <LostItemDetail /> },
      { path: 'lost-items/create', element: <ProtectedRoute><LostItemForm /></ProtectedRoute> },
      { path: 'lost-items/:id/edit', element: <ProtectedRoute><LostItemForm /></ProtectedRoute> },
      { path: 'found-items', element: <FoundItemList /> },
      { path: 'found-items/:id', element: <FoundItemDetail /> },
      { path: 'found-items/create', element: <ProtectedRoute><FoundItemForm /></ProtectedRoute> },
      { path: 'found-items/:id/edit', element: <ProtectedRoute><FoundItemForm /></ProtectedRoute> },
      { path: 'notifications', element: <Notifications /> },
      { path: 'profile', element: <Profile /> },
      { path: 'claims', element: <Claims /> },
      { path: 'chat', element: <Chat /> },
      { path: 'users/:id', element: <UserProfile /> },
      { path: 'admin/users', element: <ProtectedRoute adminOnly><AdminUsers /></ProtectedRoute> },
      { path: 'admin/categories', element: <ProtectedRoute adminOnly><AdminCategories /></ProtectedRoute> },
      { path: 'admin/stats', element: <ProtectedRoute adminOnly><AdminStats /></ProtectedRoute> },
      { path: 'login/admin', element: <AdminLogin /> },
      { path: 'admin/logs', element: <ProtectedRoute adminOnly><AdminLogs /></ProtectedRoute> },
      { path: '*', element: <NotFound /> },
    ],
  },
]);

export default router;
