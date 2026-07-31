import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar, Toolbar, Typography, Drawer, List, ListItem, ListItemButton,
  ListItemIcon, ListItemText, Box, Badge, IconButton, Button, Avatar, Menu, MenuItem,
  Divider, ListSubheader, useMediaQuery, useTheme, Popover, Paper, Stack,
  Tooltip, CircularProgress
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
import { useChatSocket } from '../store/ChatSocketContext';
import { getUnreadCount, getNotifications, markRead } from '../api/notifications';
import type { NotificationVO } from '../api/notifications';
import { processClaim } from '../api/claims';
import { assetUrl } from '../config';

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
  return (
    <List>
      {menuItems.map(item => (
        <ListItem key={item.path} disablePadding>
          <ListItemButton selected={location.pathname === item.path}
            onClick={() => onNavigate(item.path)}>
            <ListItemIcon>
              {item.path === '/chat' && unreadTotal > 0 ? (
                <Badge badgeContent={unreadTotal} color="error" max={99}>
                  {item.icon}
                </Badge>
              ) : item.icon}
            </ListItemIcon>
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

  const [notifAnchor, setNotifAnchor] = useState<HTMLElement | null>(null);
  const [recentNotifs, setRecentNotifs] = useState<NotificationVO[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [processingId, setProcessingId] = useState<number | null>(null);

  const refreshUnread = () => {
    if (!user) return;
    getUnreadCount().then(setUnreadCount).catch(() => {});
  };

  const loadRecentNotifs = () => {
    if (!user) return;
    setNotifLoading(true);
    getNotifications({ page: 1, size: 8 })
      .then(data => setRecentNotifs(data.records || []))
      .catch(() => {})
      .finally(() => setNotifLoading(false));
  };

  useEffect(() => {
    refreshUnread();
    const timer = setInterval(refreshUnread, 10000);
    const onVis = () => { if (!document.hidden) refreshUnread(); };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('focus', refreshUnread);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('focus', refreshUnread);
    };
  }, [user]);

  const handleNav = (path: string) => {
    navigate(path);
    setMobileOpen(false);
  };

  const openNotif = (e: React.MouseEvent<HTMLElement>) => {
    setNotifAnchor(e.currentTarget);
    loadRecentNotifs();
  };

  const closeNotif = () => setNotifAnchor(null);

  const handleNotifClick = (item: NotificationVO) => {
    if (item.isRead === 0) {
      markRead(item.id).then(() => {
        setRecentNotifs(prev => prev.map(n => n.id === item.id ? { ...n, isRead: 1 } : n));
        refreshUnread();
      }).catch(() => {});
    }
    closeNotif();
    navigate('/notifications');
  };

  const handleQuickApprove = async (e: React.MouseEvent, item: NotificationVO) => {
    e.stopPropagation();
    if (!item.relatedId || item.relatedType !== 'CLAIM_APPLICATION') return;
    setProcessingId(item.id);
    try {
      await processClaim(item.relatedId, 'APPROVED');
      await markRead(item.id);
      setRecentNotifs(prev => prev.map(n => n.id === item.id ? { ...n, isRead: 1 } : n));
      refreshUnread();
      closeNotif();
    } catch {
      // ignore
    } finally {
      setProcessingId(null);
    }
  };

  const notifOpen = Boolean(notifAnchor);

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
          <IconButton color="inherit" onClick={openNotif}>
            <Badge badgeContent={unreadCount} color="error"><NotificationsIcon /></Badge>
          </IconButton>
          <Popover
            open={notifOpen}
            anchorEl={notifAnchor}
            onClose={closeNotif}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            slotProps={{ paper: { sx: { width: 360, maxHeight: 420, overflow: 'auto' } } }}
          >
            <Paper>
              <Box sx={{ p: 1.5, borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="subtitle2">通知</Typography>
                <Button size="small" onClick={() => { closeNotif(); navigate('/notifications'); }}>查看全部</Button>
              </Box>
              {notifLoading ? (
                <Box sx={{ py: 4, display: 'flex', justifyContent: 'center' }}><CircularProgress size={24} /></Box>
              ) : recentNotifs.length === 0 ? (
                <Box sx={{ p: 3, textAlign: 'center' }}>
                  <Typography color="text.secondary" variant="body2">暂无通知</Typography>
                </Box>
              ) : (
                <Stack divider={<Divider />}>
                  {recentNotifs.map(item => (
                    <Box
                      key={item.id}
                      onClick={() => handleNotifClick(item)}
                      sx={{
                        p: 1.5,
                        cursor: 'pointer',
                        bgcolor: item.isRead === 0 ? 'action.hover' : 'transparent',
                        '&:hover': { bgcolor: 'action.selected' }
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="body2" sx={{ fontWeight: item.isRead === 0 ? 'bold' : 'normal', mb: 0.5 }}>
                            {item.isRead === 0 && <Box component="span" sx={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', bgcolor: 'error.main', mr: 0.8, verticalAlign: 'middle' }} />}
                            {item.title}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {item.content}
                          </Typography>
                          <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5, display: 'block' }}>
                            {new Date(item.createdAt).toLocaleString('zh-CN')}
                          </Typography>
                        </Box>
                        {item.type === 'CLAIM' && item.relatedType === 'CLAIM_APPLICATION' && (
                          <Tooltip title="确认已被该用户认领/找到">
                            <Button
                              size="small"
                              variant="contained"
                              disabled={processingId === item.id}
                              onClick={(e) => handleQuickApprove(e, item)}
                              sx={{ flexShrink: 0, fontSize: '0.7rem', px: 1, py: 0.3, minWidth: 'auto' }}
                            >
                              {processingId === item.id ? '...' : '确认'}
                            </Button>
                          </Tooltip>
                        )}
                      </Box>
                    </Box>
                  ))}
                </Stack>
              )}
            </Paper>
          </Popover>
          {user ? (
            <>
              <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
                <Avatar src={assetUrl(user?.avatar || '') || undefined} sx={{ width: 32, height: 32, bgcolor: 'secondary.main' }}>
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
