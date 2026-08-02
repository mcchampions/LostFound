import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Button, List, ListItemButton, ListItemText,
  ListItemIcon, Chip, Pagination, CircularProgress, Alert,
  Dialog, DialogTitle, DialogContent, DialogActions, Badge
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  Campaign as AnnounceIcon,
  Info as InfoIcon,
  Assignment as ClaimIcon,
  TaskAlt as ClaimResultIcon
} from '@mui/icons-material';
import { useAuth } from '../store/AuthContext';
import { useChatSocket } from '../store/ChatSocketContext';
import { getNotifications, markRead, markAllRead } from '../api/notifications';
import type { NotificationVO } from '../api/notifications';
import { processClaim } from '../api/claims';

const typeIcons: Record<string, React.ReactElement> = {
  CLAIM: <ClaimIcon fontSize="small" />,
  CLAIM_RESULT: <ClaimResultIcon fontSize="small" />,
  SYSTEM: <InfoIcon fontSize="small" />,
  ANNOUNCEMENT: <AnnounceIcon fontSize="small" />,
};

const typeLabels: Record<string, string> = {
  CLAIM: '认领',
  CLAIM_RESULT: '申请结果',
  SYSTEM: '系统',
  ANNOUNCEMENT: '公告',
};

const typeColors: Record<string, 'warning' | 'info' | 'primary' | 'success'> = {
  CLAIM: 'warning',
  CLAIM_RESULT: 'success',
  SYSTEM: 'info',
  ANNOUNCEMENT: 'primary',
};

export default function Notifications() {
  const { user } = useAuth();
  const { refreshNotificationUnread } = useChatSocket();

  const [notifications, setNotifications] = useState<NotificationVO[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selected, setSelected] = useState<NotificationVO | null>(null);
  const [processing, setProcessing] = useState(false);

  const pageSize = 10;

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      const data = await getNotifications({ page, size: pageSize });
      setNotifications(data.records || []);
      setTotal(data.total || 0);
      setTotalPages(Math.ceil((data.total || 0) / pageSize) || 1);
    } catch {
      setError('加载通知失败');
    } finally {
      setLoading(false);
    }
  }, [page, user]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleClick = async (item: NotificationVO) => {
    setSelected(item);
    setDialogOpen(true);
    if (item.isRead === 0) {
      try {
        await markRead(item.id);
        setNotifications(prev =>
          prev.map(n => (n.id === item.id ? { ...n, isRead: 1 } : n))
        );
        refreshNotificationUnread();
      } catch {
        // ignore
      }
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: 1 })));
      refreshNotificationUnread();
    } catch {
      // ignore
    }
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelected(null);
  };

  const handleQuickApprove = async () => {
    if (!selected?.relatedId || selected.relatedType !== 'CLAIM_APPLICATION') return;
    setProcessing(true);
    try {
      await processClaim(selected.relatedId, 'APPROVED');
      await markRead(selected.id);
      const id = selected.id;
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: 1 } : n));
      handleCloseDialog();
      fetchNotifications();
      refreshNotificationUnread();
    } catch {
      // ignore
    } finally {
      setProcessing(false);
    }
  };

  const handlePageChange = (_: any, value: number) => {
    setPage(value);
  };

  const hasUnread = notifications.some(n => n.isRead === 0);

  if (!user) {
    return (
      <Box sx={{ textAlign: 'center', py: 6 }}>
        <Typography variant="h6" color="text.secondary">请先登录</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ pb: 1, borderBottom: 2, borderColor: 'primary.main', display: 'inline-block' }}>消息通知</Typography>
        {hasUnread && (
          <Button variant="outlined" size="small" onClick={handleMarkAllRead}>
            全部已读
          </Button>
        )}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : notifications.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <NotificationsIcon sx={{ fontSize: 60, color: 'grey.400', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">暂无通知</Typography>
        </Box>
      ) : (
        <>
          <List sx={{ bgcolor: 'background.paper', borderRadius: 1 }}>
            {notifications.map(item => (
              <ListItemButton
                key={item.id}
                onClick={() => handleClick(item)}
                sx={{
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  bgcolor: item.isRead === 0 ? 'action.hover' : 'transparent',
                }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  <Chip
                    icon={typeIcons[item.type] || <InfoIcon fontSize="small" />}
                    label={typeLabels[item.type] || item.type}
                    size="small"
                    color={typeColors[item.type] || 'default'}
                    variant="outlined"
                  />
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Typography
                      variant="body1"
                      sx={{ fontWeight: item.isRead === 0 ? 'bold' : 'normal' }}
                    >
                      {item.isRead === 0 && (
                        <Badge
                          variant="dot"
                          color="error"
                          sx={{ mr: 1, '& .MuiBadge-badge': { top: 4 } }}
                        />
                      )}
                      {item.title}
                    </Typography>
                  }
                  secondary={
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                      <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 400 }}>
                        {item.content}
                      </Typography>
                      <Typography variant="caption" color="text.disabled" sx={{ flexShrink: 0, ml: 2 }}>
                        {new Date(item.createdAt).toLocaleString('zh-CN')}
                      </Typography>
                    </Box>
                  }
                />
              </ListItemButton>
            ))}
          </List>

          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={handlePageChange}
                color="primary"
              />
            </Box>
          )}

          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>
            共 {total} 条通知
          </Typography>
        </>
      )}

      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {selected && (
            <Chip
              icon={typeIcons[selected.type] || <InfoIcon fontSize="small" />}
              label={typeLabels[selected.type] || selected.type}
              size="small"
              color={typeColors[selected.type] || 'default'}
            />
          )}
          {selected?.title}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', mt: 1 }}>
            {selected?.content}
          </Typography>
          <Typography variant="caption" color="text.disabled" sx={{ mt: 2, display: 'block' }}>
            {selected && new Date(selected.createdAt).toLocaleString('zh-CN')}
          </Typography>
        </DialogContent>
        <DialogActions>
          {selected?.type === 'CLAIM' && selected?.relatedType === 'CLAIM_APPLICATION' && (
            <Button onClick={handleQuickApprove} disabled={processing} variant="contained" color="primary">
              {processing ? '处理中...' : '确认已被该用户认领/找到'}
            </Button>
          )}
          <Button onClick={handleCloseDialog}>关闭</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
