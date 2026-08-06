import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Box, Typography, Paper, Avatar, CircularProgress, Alert,
  Grid, Tabs, Tab, Card, CardMedia, CardContent, CardActionArea, Chip,
  Button, Pagination
} from '@mui/material';
import { ArrowBack as BackIcon, ImageOutlined as ImageIcon } from '@mui/icons-material';
import client from '../api/client';
import { assetUrl } from '../config';
import { getApiErrorMessage } from '../api/errors';

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
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [items, setItems] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await client.get(`/users/${id}/public-profile`);
      setProfile(res.data.data);
    } catch (errorValue) {
      setError(getApiErrorMessage(errorValue, '用户不存在或已不可用'));
    }
  }, [id]);

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
      setError(getApiErrorMessage(errorValue, '加载用户发布内容失败'));
    }
  }, [id, tab, page]);

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
          返回
        </Button>
        <Alert severity="warning">{error || '用户不存在'}</Alert>
      </Box>
    );
  }

  const displayName = profile.realName || profile.username;

  const getStatusChip = (item: UserItem) => {
    if (item.itemType === 'LOST') {
      return item.status === 'LOST'
        ? <Chip label="未找到" size="small" color="error" />
        : <Chip label="已找到" size="small" color="success" />;
    }
    return item.status === 'UNCLAIMED'
      ? <Chip label="待认领" size="small" color="warning" />
      : <Chip label="已认领" size="small" color="success" />;
  };

  const formatTimeRange = (start?: string, end?: string) => {
    if (!start) return '';
    const s = new Date(start).toLocaleString('zh-CN');
    return end ? `${s} ~ ${new Date(end).toLocaleString('zh-CN')}` : s;
  };

  return (
    <Box>
      <Button startIcon={<BackIcon />} onClick={() => navigate(-1)} sx={{ mb: 2 }}>
        返回
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
                加入时间：{new Date(profile.createdAt).toLocaleDateString('zh-CN')}
              </Typography>
            )}
          </Box>
        </Box>

        {/* Stats */}
        <Grid container spacing={2} sx={{ mt: 2 }}>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h5" color="error.main">{profile.lostCount}</Typography>
              <Typography variant="body2" color="text.secondary">发布失物</Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h5" color="warning.main">{profile.foundCount}</Typography>
              <Typography variant="body2" color="text.secondary">发布招领</Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h5" color="success.main">{profile.helpedCount}</Typography>
              <Typography variant="body2" color="text.secondary">帮助解决</Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h5" color="info.main">{profile.pendingCount}</Typography>
              <Typography variant="body2" color="text.secondary">处理中</Typography>
            </Paper>
          </Grid>
        </Grid>
      </Paper>

      {/* Tabs */}
      <Paper sx={{ mb: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 2 }}>
          <Tab label="发布的内容" />
          <Tab label="帮助解决" />
        </Tabs>
      </Paper>

      {/* Item list */}
      {items.length === 0 ? (
        <Alert severity="info">暂无内容</Alert>
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
                      <Chip label={item.itemType === 'LOST' ? '失物' : '招领'} size="small" variant="outlined" />
                    </Box>
                    {item.location && (
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        地点：{item.location}
                      </Typography>
                    )}
                    {item.eventTime && (
                      <Typography variant="body2" color="text.secondary">
                        时间：{formatTimeRange(item.eventTime, item.eventTimeEnd)}
                      </Typography>
                    )}
                    {tab === 1 && item.publisherName && (
                      <Typography variant="caption" color="text.disabled" sx={{ mt: 1, display: 'block' }}>
                        发布者：
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
    </Box>
  );
}
