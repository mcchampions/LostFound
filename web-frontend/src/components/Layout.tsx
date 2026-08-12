import { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  AppBar, Avatar, Badge, Box, Button, Drawer, Divider, IconButton, List, ListItem,
  ListItemButton, ListItemIcon, ListItemText, ListSubheader, Menu, MenuItem, Toolbar,
  Typography, useMediaQuery, useTheme,
} from '@mui/material';
import {
  Add as AddIcon, BarChart as BarChartIcon, Category as CategoryIcon, Chat as ChatIcon,
  Group as GroupIcon, History as HistoryIcon, Home as HomeIcon, Logout as LogoutIcon,
  Menu as MenuIcon, Notifications as NotificationsIcon, Person as PersonIcon,
  Search as SearchIcon, Campaign as CampaignIcon, DeleteSweep as TrashIcon,
} from '@mui/icons-material';
import { useAuth } from '../store/AuthContext';
import { useChatSse } from '../store/ChatSseContext';
import { useTranslation } from 'react-i18next';
import { assetUrl, SITE_NAME } from '../config';
import NotificationPopover from './NotificationPopover';

const DRAWER_WIDTH = 240;

function pageTitle(pathname: string, t: (key: string) => string) {
  if (pathname === '/login') return t('auth.loginTitle');
  if (pathname === '/login/admin') return t('auth.adminLoginTitle');
  if (pathname === '/register') return t('auth.registerTitle');
  if (pathname === '/forgot-password') return t('auth.resetTitle');
  if (pathname.startsWith('/admin')) return t('nav.admin');
  if (pathname.startsWith('/lost-items')) return t('lostItem.listTitle');
  if (pathname.startsWith('/found-items')) return t('foundItem.listTitle');
  if (pathname.startsWith('/chat')) return t('nav.chat');
  if (pathname.startsWith('/profile')) return t('nav.profile');
  if (pathname.startsWith('/notifications')) return t('nav.notifications');
  if (pathname === '/claims') return t('claims.title');
  if (pathname.startsWith('/users/')) return t('userProfile.title');
  return t('nav.home');
}

function NavItems({ onNavigate }: { onNavigate: (path: string) => void }) {
  const { t } = useTranslation();
  const { isAdmin } = useAuth();
  const { unreadTotal } = useChatSse();
  const location = useLocation();
  const menuItems = [
    { text: t('nav.home'), icon: <HomeIcon />, path: '/' },
    { text: t('nav.lostItems'), icon: <SearchIcon />, path: '/lost-items' },
    { text: t('nav.foundItems'), icon: <AddIcon />, path: '/found-items' },
    { text: t('nav.notifications'), icon: <NotificationsIcon />, path: '/notifications' },
    { text: t('nav.chat'), icon: <ChatIcon />, path: '/chat' },
    { text: t('nav.profile'), icon: <PersonIcon />, path: '/profile' },
  ];
  const adminItems = [
    { text: t('nav.users'), icon: <GroupIcon />, path: '/admin/users' },
    { text: t('nav.categories'), icon: <CategoryIcon />, path: '/admin/categories' },
    { text: t('nav.stats'), icon: <BarChartIcon />, path: '/admin/stats' },
    { text: t('nav.logs'), icon: <HistoryIcon />, path: '/admin/logs' },
    { text: t('nav.announcements'), icon: <CampaignIcon />, path: '/admin/announcements' },
    { text: t('nav.trash'), icon: <TrashIcon />, path: '/admin/trash' },
  ];
  const renderItem = (item: typeof menuItems[number]) => (
    <ListItem key={item.path} disablePadding>
      <ListItemButton selected={location.pathname === item.path} onClick={() => onNavigate(item.path)}>
        <ListItemIcon>{item.path === '/chat' && unreadTotal > 0
          ? <Badge badgeContent={unreadTotal} color="error" max={99}>{item.icon}</Badge> : item.icon}</ListItemIcon>
        <ListItemText primary={item.text} />
      </ListItemButton>
    </ListItem>
  );
  return <List>{menuItems.map(renderItem)}{isAdmin && <>
    <Divider /><ListSubheader>{t('nav.admin')}</ListSubheader>{adminItems.map(renderItem)}
  </>}</List>;
}

export default function Layout() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const { notificationUnread, refreshNotificationUnread } = useChatSse();
  const navigate = useNavigate();
  const location = useLocation();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  useEffect(() => {
    const siteName = SITE_NAME || t('app.name');
    document.title = `${pageTitle(location.pathname, t)} - ${siteName}`;
  }, [location.pathname, t]);

  useEffect(() => {
    const refresh = () => { if (!document.hidden) refreshNotificationUnread(); };
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, [refreshNotificationUnread]);

  const navigateTo = (path: string) => { navigate(path); setMobileOpen(false); };
  const logoutAndNavigate = () => { setAnchorEl(null); logout(); navigate('/login'); };

  return <Box sx={{ display: 'flex' }}>
    <AppBar position="fixed" sx={{ zIndex: 1201 }}><Toolbar>
      {isMobile && <IconButton color="inherit" edge="start" onClick={() => setMobileOpen(true)} sx={{ mr: 1 }}><MenuIcon /></IconButton>}
      <Typography variant="h6" noWrap sx={{ flexGrow: 1 }}>{SITE_NAME || t('app.name')}</Typography>
      <NotificationPopover unread={notificationUnread} refreshUnread={refreshNotificationUnread} />
      {user ? <><IconButton onClick={event => setAnchorEl(event.currentTarget)}>
        <Avatar src={assetUrl(user.avatar || '') || undefined} sx={{ width: 32, height: 32, bgcolor: 'secondary.main' }}>{user.realName?.charAt(0) || user.username.charAt(0)}</Avatar>
      </IconButton><Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
        <MenuItem onClick={() => { setAnchorEl(null); navigate('/profile'); }}><ListItemIcon><PersonIcon fontSize="small" /></ListItemIcon>{t('nav.profile')}</MenuItem>
        <MenuItem onClick={logoutAndNavigate}><ListItemIcon><LogoutIcon fontSize="small" /></ListItemIcon>{t('nav.logout')}</MenuItem>
      </Menu></> : <Button color="inherit" onClick={() => navigate('/login')}>{t('nav.login')}</Button>}
    </Toolbar></AppBar>
    {isMobile ? <Drawer variant="temporary" open={mobileOpen} onClose={() => setMobileOpen(false)} sx={{ '& .MuiDrawer-paper': { width: DRAWER_WIDTH } }}><Toolbar /><NavItems onNavigate={navigateTo} /></Drawer>
      : <Drawer variant="permanent" sx={{ '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box' } }}><Toolbar /><NavItems onNavigate={navigateTo} /></Drawer>}
    <Box component="main" sx={{ flexGrow: 1, p: { xs: 1.5, sm: 3 }, ml: { md: `${DRAWER_WIDTH}px` } }}><Toolbar /><Outlet /></Box>
  </Box>;
}
