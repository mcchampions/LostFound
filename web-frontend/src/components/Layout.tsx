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
  Search as SearchIcon,
} from '@mui/icons-material';
import { useAuth } from '../store/AuthContext';
import { useChatSocket } from '../store/ChatSocketContext';
import { assetUrl } from '../config';
import NotificationPopover from './NotificationPopover';

const DRAWER_WIDTH = 240;

function NavItems({ onNavigate }: { onNavigate: (path: string) => void }) {
  const { isAdmin } = useAuth();
  const { unreadTotal } = useChatSocket();
  const location = useLocation();
  const menuItems = [
    { text: '首页', icon: <HomeIcon />, path: '/' },
    { text: '失物信息', icon: <SearchIcon />, path: '/lost-items' },
    { text: '招领信息', icon: <AddIcon />, path: '/found-items' },
    { text: '消息通知', icon: <NotificationsIcon />, path: '/notifications' },
    { text: '对话', icon: <ChatIcon />, path: '/chat' },
    { text: '个人中心', icon: <PersonIcon />, path: '/profile' },
  ];
  const adminItems = [
    { text: '用户管理', icon: <GroupIcon />, path: '/admin/users' },
    { text: '分类管理', icon: <CategoryIcon />, path: '/admin/categories' },
    { text: '数据统计', icon: <BarChartIcon />, path: '/admin/stats' },
    { text: '操作日志', icon: <HistoryIcon />, path: '/admin/logs' },
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
    <Divider /><ListSubheader>管理后台</ListSubheader>{adminItems.map(renderItem)}
  </>}</List>;
}

export default function Layout() {
  const { user, logout } = useAuth();
  const { notificationUnread, refreshNotificationUnread } = useChatSocket();
  const navigate = useNavigate();
  const location = useLocation();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  useEffect(() => {
    const title = location.pathname.startsWith('/admin') ? '管理后台'
      : location.pathname.startsWith('/lost-items') ? '失物信息'
        : location.pathname.startsWith('/found-items') ? '招领信息'
          : location.pathname.startsWith('/chat') ? '对话'
            : location.pathname.startsWith('/profile') ? '个人中心'
              : location.pathname.startsWith('/notifications') ? '消息通知'
                : location.pathname.startsWith('/users/') ? '用户主页' : '首页';
    document.title = `${title} - 校园失物招领系统`;
  }, [location.pathname]);

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
      <Typography variant="h6" noWrap sx={{ flexGrow: 1 }}>校园失物招领系统</Typography>
      <NotificationPopover unread={notificationUnread} refreshUnread={refreshNotificationUnread} />
      {user ? <><IconButton onClick={event => setAnchorEl(event.currentTarget)}>
        <Avatar src={assetUrl(user.avatar || '') || undefined} sx={{ width: 32, height: 32, bgcolor: 'secondary.main' }}>{user.realName?.charAt(0) || user.username.charAt(0)}</Avatar>
      </IconButton><Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
        <MenuItem onClick={() => { setAnchorEl(null); navigate('/profile'); }}><ListItemIcon><PersonIcon fontSize="small" /></ListItemIcon>个人中心</MenuItem>
        <MenuItem onClick={logoutAndNavigate}><ListItemIcon><LogoutIcon fontSize="small" /></ListItemIcon>退出登录</MenuItem>
      </Menu></> : <Button color="inherit" onClick={() => navigate('/login')}>登录</Button>}
    </Toolbar></AppBar>
    {isMobile ? <Drawer variant="temporary" open={mobileOpen} onClose={() => setMobileOpen(false)} sx={{ '& .MuiDrawer-paper': { width: DRAWER_WIDTH } }}><Toolbar /><NavItems onNavigate={navigateTo} /></Drawer>
      : <Drawer variant="permanent" sx={{ '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box' } }}><Toolbar /><NavItems onNavigate={navigateTo} /></Drawer>}
    <Box component="main" sx={{ flexGrow: 1, p: { xs: 1.5, sm: 3 }, ml: { md: `${DRAWER_WIDTH}px` } }}><Toolbar /><Outlet /></Box>
  </Box>;
}
