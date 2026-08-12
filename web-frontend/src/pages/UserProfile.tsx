import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Box, Typography, Paper, Avatar, CircularProgress, Alert,
  Grid, Tabs, Tab, Card, CardMedia, CardContent, CardActionArea, Chip,
  Button, Pagination, Snackbar
} from '@mui/material';
import {
  ArrowBack as BackIcon, Chat as ChatIcon, ImageOutlined as ImageIcon
} from '@mui/icons-material';
import client from '../api/client';
import { startConversation } from '../api/chat';
import { assetUrl } from '../config';
import { getApiErrorMessage } from '../api/errors';
import { useAuth } from '../store/AuthContext';
import { useTranslation } from 'react-i18next';

interface PublicProfile {
  id: number;
  username: string;
  realName: string;
  avatar: string;
  createdAt: string;
  lostCount: number;
  foundCount: number;
  resolvedCount: number;
  helpedCount: number;
  pendingCount: number;
}

interface UserItem {
  id: number;
  userId: number;
  itemType: string;
  title: string;
  status: string;
  coverImage: string;
  location: string;
  createdAt: string;
  eventTime: string;
  eventTimeEnd: string;
  publisherName: string;
  resolvedType: string;
  resolvedBy: number;
  resolvedByName: string;
  resolvedNote: string;
}

export default function UserProfile() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [items, setItems] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [chatStarting, setChatStarting] = useState(false);
  const [actionError, setActionError] = useState('');

  const fetchProfile = useCallback(async () => {
    try {
      const res = await client.get(`/users/${id}/public-profile`);
      setProfile(res.data.data);
    } catch (errorValue) {
      setError(getApiErrorMessage(errorValue, t('userProfile.loadFailed')));
    }
  }, [id, t]);

  const fetchItems = useCallback(async () => {
    const scope = tab === 0 ? 'published' : 'helped';
    try {
      const res = await client.get(`/users/${id}/items`, {
        params: { scope, type: 'all', page, size: 12 },
      });
      const data = res.data.data;
      setItems(data.records || []);
      setTotalPages(Math.ceil((data.total || 0) / (data.size || 12)) || 1);
    } catch (errorValue) {
      setItems([]);
      setError(getApiErrorMessage(errorValue, t('userProfile.loadItemsFailed')));
    }
  }, [id, tab, page, t]);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchProfile(), fetchItems()])
      .finally(() => setLoading(false));
  }, [fetchProfile, fetchItems]);

  useEffect(() => {
    setPage(1);
  }, [tab]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !profile) {
    return (
      <Box>
        <Button startIcon={<BackIcon />} onClick={() => navigate(-1)} sx={{ mb: 2 }}>
          {t('userProfile.back')}
        </Button>
        <Alert severity="warning">{error || t('userProfile.userNotFound')}</Alert>
      </Box>
    );
  }

  const displayName = profile.realName || profile.username;

  const handleStartChat = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    setChatStarting(true);
    try {
      const data = await startConversation(profile.id);
      navigate(`/chat?conv=${data.conversationId}&to=${profile.id}&name=${encodeURIComponent(displayName)}`);
    } catch (errorValue) {
      setActionError(getApiErrorMessage(errorValue, t('userProfile.startChatFailed')));
    } finally {
      setChatStarting(false);
    }
  };

  const getStatusChip = (item: UserItem) => {
    if (item.itemType === 'LOST') {
      return item.status === 'LOST'
        ? <Chip label={t('userProfile.notFound')} size="small" color="error" />
        : <Chip label={t('userProfile.found')} size="small" color="success" />;
    }
    return item.status === 'UNCLAIMED'
      ? <Chip label={t('userProfile.unclaimed')} size="small" color="warning" />
      : <Chip label={t('userProfile.claimed')} size="small" color="success" />;
  };

  const formatTimeRange = (start?: string, end?: string) => {
    if (!start) return '';
    const s = new Date(start).toLocaleString('zh-CN');
    return end ? `${s} ~ ${new Date(end).toLocaleString('zh-CN')}` : s;
  };

  return (
    <Box>
      <Button startIcon={<BackIcon />} onClick={() => navigate(-1)} sx={{ mb: 2 }}>
        {t('userProfile.back')}
      </Button>

      {/* Profile header */}
      <Paper sx={{ p: 4, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
          <Avatar
            src={assetUrl(profile.avatar || '') || undefined}
            sx={{ width: 80, height: 80, fontSize: 32, bgcolor: 'primary.main' }}
          >
            {displayName.charAt(0)}
          </Avatar>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h5">{displayName}</Typography>
            <Typography variant="body2" color="text.secondary">@{profile.username}</Typography>
            {profile.createdAt && (
              <Typography variant="caption" color="text.secondary">
                {t('userProfile.joinDate', { date: new Date(profile.createdAt).toLocaleDateString('zh-CN') })}
              </Typography>
            )}
          </Box>
          {user?.id !== profile.id && (
            <Button variant="contained" startIcon={<ChatIcon />} onClick={handleStartChat}
              disabled={chatStarting}>
              {t('userProfile.startChat')}
            </Button>
          )}
        </Box>

        {/* Stats */}
        <Grid container spacing={2} sx={{ mt: 2 }}>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h5" color="error.main">{profile.lostCount}</Typography>
              <Typography variant="body2" color="text.secondary">{t('userProfile.publishedLost')}</Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h5" color="warning.main">{profile.foundCount}</Typography>
              <Typography variant="body2" color="text.secondary">{t('userProfile.publishedFound')}</Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h5" color="success.main">{profile.helpedCount}</Typography>
              <Typography variant="body2" color="text.secondary">{t('userProfile.helped')}</Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h5" color="info.main">{profile.pendingCount}</Typography>
              <Typography variant="body2" color="text.secondary">{t('userProfile.pending')}</Typography>
            </Paper>
          </Grid>
        </Grid>
      </Paper>

      {/* Tabs */}
      <Paper sx={{ mb: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 2 }}>
          <Tab label={t('userProfile.publishedTab')} />
          <Tab label={t('userProfile.helpedTab')} />
        </Tabs>
      </Paper>

      {/* Item list */}
      {items.length === 0 ? (
        <Alert severity="info">{t('userProfile.noContent')}</Alert>
      ) : (
        <Grid container spacing={2}>
          {items.map(item => (
            <Grid key={`${item.itemType}-${item.id}`} size={{ xs: 12, sm: 6, md: 4 }}>
              <Card sx={{ height: '100%' }}>
                <CardActionArea
                  onClick={() => navigate(item.itemType === 'LOST' ? `/lost-items/${item.id}` : `/found-items/${item.id}`)}
                  sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}
                >
                  {item.coverImage ? (
                    <CardMedia
                      component="img"
                      image={assetUrl(item.coverImage)}
                      sx={{ aspectRatio: '16 / 9', width: '100%', objectFit: 'cover', bgcolor: 'grey.200', display: 'block' }}
                    />
                  ) : (
                    <Box sx={{
                      aspectRatio: '16 / 9', width: '100%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      bgcolor: 'grey.100'
                    }}>
                      <ImageIcon sx={{ fontSize: 48, color: 'grey.400' }} />
                    </Box>
                  )}
                  <CardContent sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 'bold', flex: 1 }} noWrap>
                        {item.title}
                      </Typography>
                      {getStatusChip(item)}
                    </Box>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1 }}>
                      <Chip label={item.itemType === 'LOST' ? t('userProfile.lost') : t('userProfile.found')} size="small" variant="outlined" />
                    </Box>
                    {item.location && (
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {t('userProfile.location', { value: item.location })}
                      </Typography>
                    )}
                    {item.eventTime && (
                      <Typography variant="body2" color="text.secondary">
                        {t('userProfile.time', { value: formatTimeRange(item.eventTime, item.eventTimeEnd) })}
                      </Typography>
                    )}
                    {tab === 1 && item.publisherName && (
                      <Typography variant="caption" color="text.disabled" sx={{ mt: 1, display: 'block' }}>
                        {t('userProfile.publisher')}
                        <Link to={`/users/${item.userId}`} style={{ color: 'inherit', textDecoration: 'underline', textUnderlineOffset: 2 }}>
                          {item.publisherName}
                        </Link>
                      </Typography>
                    )}
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Pagination count={totalPages} page={page} onChange={(_, p) => setPage(p)} color="primary" />
        </Box>
      )}
      <Snackbar open={Boolean(actionError)} autoHideDuration={3000}
        onClose={() => setActionError('')} message={actionError} />
    </Box>
  );
}
