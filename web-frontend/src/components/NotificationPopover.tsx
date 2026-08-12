import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert, Badge, Box, Button, CircularProgress, Divider, IconButton, Paper, Popover, Stack,
  Tooltip, Typography,
} from '@mui/material';
import { Notifications as NotificationsIcon } from '@mui/icons-material';
import { getNotifications, markRead } from '../api/notifications';
import type { NotificationVO } from '../api/notifications';
import { processClaim } from '../api/claims';
import { getApiErrorMessage } from '../api/errors';
import { useTranslation } from 'react-i18next';

interface NotificationPopoverProps {
  unread: number;
  refreshUnread: () => void;
}

export default function NotificationPopover({ unread, refreshUnread }: NotificationPopoverProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [items, setItems] = useState<NotificationVO[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    setError('');
    getNotifications({ page: 1, size: 8 })
      .then(data => setItems(data.records || []))
      .catch(errorValue => {
        setItems([]);
        setError(getApiErrorMessage(errorValue, t('notifications.loadFailed')));
      })
      .finally(() => setLoading(false));
  };

  const open = (event: React.MouseEvent<HTMLElement>) => {
    setAnchor(event.currentTarget);
    load();
  };

  const close = () => setAnchor(null);

  const handleClick = (item: NotificationVO) => {
    const mark = !item.isRead
      ? markRead(item.id).then(() => {
        setItems(previous => previous.map(current => current.id === item.id
          ? { ...current, isRead: true } : current));
        refreshUnread();
      })
      : Promise.resolve();
    mark.catch(errorValue => setError(getApiErrorMessage(errorValue, t('notifications.markReadFailed'))))
      .finally(() => { close(); navigate('/notifications'); });
  };

  const quickApprove = async (event: React.MouseEvent, item: NotificationVO) => {
    event.stopPropagation();
    if (!item.relatedId || item.relatedType !== 'CLAIM_APPLICATION') return;
    setProcessingId(item.id);
    try {
      await processClaim(item.relatedId, 'APPROVED');
      await markRead(item.id);
      setItems(previous => previous.map(current => current.id === item.id
        ? { ...current, isRead: true } : current));
      refreshUnread();
      close();
    } catch (errorValue) {
      setError(getApiErrorMessage(errorValue, t('notifications.processClaimFailed')));
    } finally { setProcessingId(null); }
  };

  return (
    <>
      <IconButton color="inherit" onClick={open}>
        <Badge badgeContent={unread} color="error"><NotificationsIcon /></Badge>
      </IconButton>
      <Popover open={Boolean(anchor)} anchorEl={anchor} onClose={close}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { width: 360, maxHeight: 420, overflow: 'auto' } } }}>
        <Paper>
          <Box sx={{ p: 1.5, borderBottom: 1, borderColor: 'divider', display: 'flex',
            justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="subtitle2">{t('notifications.title')}</Typography>
            <Button size="small" onClick={() => { close(); navigate('/notifications'); }}>{t('notifications.viewAll')}</Button>
          </Box>
          {error && <Alert severity="error" sx={{ m: 1.5 }}>{error}</Alert>}
          {loading ? <Box sx={{ py: 4, display: 'flex', justifyContent: 'center' }}><CircularProgress size={24} /></Box>
            : items.length === 0 ? <Box sx={{ p: 3, textAlign: 'center' }}><Typography color="text.secondary" variant="body2">{t('notifications.noNotifications')}</Typography></Box>
              : <Stack divider={<Divider />}>{items.map(item => (
                <Box key={item.id} onClick={() => handleClick(item)} sx={{ p: 1.5, cursor: 'pointer',
                  bgcolor: !item.isRead ? 'action.hover' : 'transparent', '&:hover': { bgcolor: 'action.selected' } }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontWeight: !item.isRead ? 'bold' : 'normal', mb: 0.5 }}>
                        {!item.isRead && <Box component="span" sx={{ display: 'inline-block', width: 6, height: 6,
                          borderRadius: '50%', bgcolor: 'error.main', mr: 0.8, verticalAlign: 'middle' }} />}
                        {item.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.content}</Typography>
                      <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5, display: 'block' }}>{new Date(item.createdAt).toLocaleString('zh-CN')}</Typography>
                    </Box>
                    {item.type === 'CLAIM' && item.relatedType === 'CLAIM_APPLICATION' && <Tooltip title={t('notifications.confirmClaim')}>
                      <Button size="small" variant="contained" disabled={processingId === item.id}
                        onClick={event => quickApprove(event, item)} sx={{ flexShrink: 0, fontSize: '0.7rem', px: 1, py: 0.3, minWidth: 'auto' }}>
                        {processingId === item.id ? '...' : t('common.confirm')}
                      </Button>
                    </Tooltip>}
                  </Box>
                </Box>
              ))}</Stack>}
        </Paper>
      </Popover>
    </>
  );
}
