import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar, Toolbar, Typography, Drawer, List, ListItem, ListItemButton,
  ListItemIcon, ListItemText, Box, Badge, IconButton, Button, Avatar, Menu, MenuItem,
  Divider, ListSubheader, useMediaQuery, useTheme
} from '@mui/material';
import {
  Home as HomeIcon, Search as SearchIcon, Add as AddIcon,
  Notifications as NotificationsIcon, Person as PersonIcon,
  Group as GroupIcon, Category as CategoryIcon, BarChart as BarChartIcon,
  History as HistoryIcon, Logout as LogoutIcon,
  Chat as ChatIcon,
  Menu as MenuIcon
} from '@mui/icons-material';
import { useAuth } from '../store/AuthContext';
import { getUnreadCount } from '../api/notifications';

const DRAWER_WIDTH = 240;

function NavItems({ onNavigate }: { onNavigate: (path: string) => void }) {
  const { isAdmin } = useAuth();
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
  return (
    <List>
      {menuItems.map(item => (
        <ListItem key={item.path} disablePadding>
          <ListItemButton selected={location.pathname === item.path}
            onClick={() => onNavigate(item.path)}>
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={item.text} />
          </ListItemButton>
        </ListItem>
      ))}
      {isAdmin && (
        <>
          <Divider />
          <ListSubheader>管理后台</ListSubheader>
          {adminItems.map(item => (
            <ListItem key={item.path} disablePadding>
              <ListItemButton selected={location.pathname === item.path}
                onClick={() => onNavigate(item.path)}>
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItemButton>
            </ListItem>
          ))}
        </>
      )}
    </List>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const handleNav = (path: string) => {
    navigate(path);
    setMobileOpen(false);
  };

  useEffect(() => {
    if (!user) return;
    const fetch = () => { getUnreadCount().then(setUnreadCount).catch(() => {}); };
    fetch();
    const timer = setInterval(fetch, 30000);
    return () => clearInterval(timer);
  }, [user]);

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar position="fixed" sx={{ zIndex: 1201 }}>
        <Toolbar>
          {isMobile && (
            <IconButton color="inherit" edge="start" onClick={() => setMobileOpen(true)} sx={{ mr: 1 }}>
              <MenuIcon />
            </IconButton>
          )}
          <Typography variant="h6" noWrap sx={{ flexGrow: 1 }}>校园失物招领系统</Typography>
          <IconButton color="inherit" onClick={() => navigate('/notifications')}>
            <Badge badgeContent={unreadCount} color="error"><NotificationsIcon /></Badge>
          </IconButton>
          {user ? (
            <>
              <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
                <Avatar src={user?.avatar || undefined} sx={{ width: 32, height: 32, bgcolor: 'secondary.main' }}>
                  {user.realName?.charAt(0) || user.username.charAt(0)}
                </Avatar>
              </IconButton>
              <Menu anchorEl={anchorEl} open={!!anchorEl} onClose={() => setAnchorEl(null)}>
                <MenuItem onClick={() => { setAnchorEl(null); navigate('/profile'); }}>
                  <ListItemIcon><PersonIcon fontSize="small" /></ListItemIcon>个人中心
                </MenuItem>
                <MenuItem onClick={() => { setAnchorEl(null); logout(); navigate('/login'); }}>
                  <ListItemIcon><LogoutIcon fontSize="small" /></ListItemIcon>退出登录
                </MenuItem>
              </Menu>
            </>
          ) : (
            <Button color="inherit" onClick={() => navigate('/login')}>登录</Button>
          )}
        </Toolbar>
      </AppBar>
      {isMobile ? (
        <Drawer variant="temporary" open={mobileOpen} onClose={() => setMobileOpen(false)}
          sx={{ '& .MuiDrawer-paper': { width: DRAWER_WIDTH } }}>
          <Toolbar />
          <NavItems onNavigate={handleNav} />
        </Drawer>
      ) : (
        <Drawer variant="permanent"
          sx={{ '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box' } }}>
          <Toolbar />
          <NavItems onNavigate={handleNav} />
        </Drawer>
      )}
      <Box component="main" sx={{ flexGrow: 1, p: { xs: 1.5, sm: 3 }, ml: { md: `${DRAWER_WIDTH}px` } }}>
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
}
