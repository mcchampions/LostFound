import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Box, Typography, Button, Paper, Grid, Card, CardContent,
  CardActionArea, Chip, CircularProgress, Alert, List, ListItem,
  ListItemText, Divider
} from '@mui/material';
import type { Theme } from '@mui/material/styles';
import {
  Search as SearchIcon, Add as AddIcon,
  Campaign as AnnounceIcon, FindInPage as LostIcon,
  Beenhere as FoundIcon
} from '@mui/icons-material';
import { useAuth } from '../store/AuthContext';
import { getLostItems } from '../api/lostItems';
import type { LostItemVO } from '../api/lostItems';
import { getFoundItems } from '../api/foundItems';
import type { FoundItemVO } from '../api/foundItems';
import client from '../api/client';
import { getApiErrorMessage } from '../api/errors';

interface Announcement {
  id: number;
  title: string;
  content: string;
  createdAt: string;
}

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [lostItems, setLostItems] = useState<LostItemVO[]>([]);
  const [foundItems, setFoundItems] = useState<FoundItemVO[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [stats, setStats] = useState({ lostTotal: 0, foundTotal: 0, claimedTotal: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        const results = await Promise.allSettled([
          getLostItems({ page: 1, size: 4 }),
          getFoundItems({ page: 1, size: 4 }),
          client.get('/announcements', { params: { page: 1, size: 5 } }),
        ]);

        const lostRes = results[0].status === 'fulfilled' ? results[0].value : null;
        const foundRes = results[1].status === 'fulfilled' ? results[1].value : null;
        const annRes = results[2].status === 'fulfilled' ? results[2].value : null;

        setLostItems(lostRes?.records || []);
        setFoundItems(foundRes?.records || []);
        setAnnouncements(annRes?.data?.data?.records || []);

        setStats({
          lostTotal: lostRes?.total || 0,
          foundTotal: foundRes?.total || 0,
          claimedTotal: 0,
        });

        const rejected = results.find(result => result.status === 'rejected');
        if (rejected && rejected.status === 'rejected') {
          setError(getApiErrorMessage(rejected.reason, '部分数据加载失败'));
        }
      } catch (errorValue) {
        setError(getApiErrorMessage(errorValue, '加载数据失败'));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Not logged in: welcome hero
  if (!user) {
    return (
      <Box>
        <Box
          sx={{
            minHeight: '80vh',
            background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 50%, #bbdefb 100%)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            color: 'white',
            textAlign: 'center',
            px: 3,
            py: 8,
            borderRadius: 4,
            mx: -3,
          }}
        >
          <Typography variant="h3" gutterBottom sx={{ fontWeight: 'bold' }}>
            校园失物招领
          </Typography>
          <Typography variant="h6" sx={{ mb: 4, maxWidth: 500, opacity: 0.9 }}>
            帮助校园师生快速找回遗失物品
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
            <Button
              variant="contained"
              size="large"
              sx={{ bgcolor: 'white', color: 'primary.main', '&:hover': { bgcolor: 'grey.200' } }}
              onClick={() => navigate('/login')}
            >
              发布失物
            </Button>
            <Button
              variant="outlined"
              size="large"
              sx={{ borderColor: 'white', color: 'white', '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' } }}
              onClick={() => navigate('/login')}
            >
              发布招领
            </Button>
          </Box>
          <Box>
            <Typography variant="body2" sx={{ opacity: 0.8 }}>
              已经有账号？{' '}
              <Link to="/login" style={{ color: 'white', fontWeight: 'bold' }}>立即登录</Link>
              {' '}|{' '}
              还没有账号？{' '}
              <Link to="/register" style={{ color: 'white', fontWeight: 'bold' }}>立即注册</Link>
            </Typography>
          </Box>
        </Box>

        {announcements.length > 0 && (
          <Paper sx={{ mt: 4, p: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <AnnounceIcon color="warning" /> 公告
            </Typography>
            <List dense>
              {announcements.map((a, i) => (
                <Box key={a.id}>
                  <ListItem>
                    <ListItemText
                      primary={a.title}
                      secondary={new Date(a.createdAt).toLocaleDateString('zh-CN')}
                    />
                  </ListItem>
                  {i < announcements.length - 1 && <Divider />}
                </Box>
              ))}
            </List>
          </Paper>
        )}
      </Box>
    );
  }

  // Logged in
  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
        欢迎回来，{user?.realName || user?.username} {'👋'}
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* Stats cards */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            {[
              { label: '失物信息', value: stats.lostTotal, icon: <LostIcon fontSize="large" /> },
              { label: '招领信息', value: stats.foundTotal, icon: <FoundIcon fontSize="large" /> },
            ].map((item, idx) => (
              <Grid size={{ xs: 6, sm: 4, md: 3 }} key={item.label}>
                <Paper
                  sx={{
                    p: 3,
                    textAlign: 'center',
                    borderTop: 4,
                    borderColor: (t: Theme) => idx === 0 ? t.palette.primary.main : t.palette.success.main,
                  }}
                >
                  <Box sx={{ color: (t: Theme) => idx === 0 ? t.palette.primary.main : t.palette.success.main, mb: 1 }}>{item.icon}</Box>
                  <Typography variant="h4" sx={{ fontWeight: 'bold' }}>{item.value}</Typography>
                  <Typography variant="body2" color="text.secondary">{item.label}</Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>

          {/* Action buttons */}
          <Box sx={{ display: 'flex', gap: 2, mb: 4 }}>
            <Button
              variant="contained"
              startIcon={<SearchIcon />}
              onClick={() => navigate('/lost-items/create')}
            >
              发布失物
            </Button>
            <Button
              variant="contained"
              color="success"
              startIcon={<AddIcon />}
              onClick={() => navigate('/found-items/create')}
            >
              发布招领
            </Button>
          </Box>

          {/* Announcements */}
          {announcements.length > 0 && (
            <Paper sx={{ mb: 4, p: 2 }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AnnounceIcon color="warning" /> 公告
              </Typography>
              <List dense>
                {announcements.map((a, i) => (
                  <Box key={a.id}>
                    <ListItem>
                      <ListItemText
                        primary={a.title}
                        secondary={new Date(a.createdAt).toLocaleDateString('zh-CN')}
                      />
                    </ListItem>
                    {i < announcements.length - 1 && <Divider />}
                  </Box>
                ))}
              </List>
            </Paper>
          )}

          {/* Recent items: two columns */}
          <Grid container spacing={3}>
            {/* Recent lost items */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <LostIcon color="primary" /> 最新失物
              </Typography>
              {lostItems.length === 0 ? (
                <Typography variant="body2" color="text.secondary">暂无失物信息</Typography>
              ) : (
                <Grid container spacing={2}>
                  {lostItems.map(item => (
                    <Grid size={{ xs: 12, sm: 6 }} key={item.id}>
                      <Card>
                        <CardActionArea onClick={() => navigate(`/lost-items/${item.id}`)}>
                          <CardContent>
                            <Typography variant="subtitle1" noWrap>{item.title}</Typography>
                            <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
                              <Chip label={item.categoryName} size="small" variant="outlined" />
                              <Chip
                                label={item.status === 'LOST' ? '未找到' : '已找到'}
                                size="small"
                                color={item.status === 'LOST' ? 'error' : 'success'}
                              />
                            </Box>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                              {item.location}
                            </Typography>
                          </CardContent>
                        </CardActionArea>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}
              <Button
                size="small"
                sx={{ mt: 1 }}
                onClick={() => navigate('/lost-items')}
              >
                查看更多失物
              </Button>
            </Grid>

            {/* Recent found items */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <FoundIcon color="success" /> 最新招领
              </Typography>
              {foundItems.length === 0 ? (
                <Typography variant="body2" color="text.secondary">暂无招领信息</Typography>
              ) : (
                <Grid container spacing={2}>
                  {foundItems.map(item => (
                    <Grid size={{ xs: 12, sm: 6 }} key={item.id}>
                      <Card>
                        <CardActionArea onClick={() => navigate(`/found-items/${item.id}`)}>
                          <CardContent>
                            <Typography variant="subtitle1" noWrap>{item.title}</Typography>
                            <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
                              <Chip label={item.categoryName} size="small" variant="outlined" />
                              <Chip
                                label={item.status === 'UNCLAIMED' ? '待认领' : '已认领'}
                                size="small"
                                color={item.status === 'UNCLAIMED' ? 'warning' : 'success'}
                              />
                            </Box>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                              {item.location}
                            </Typography>
                          </CardContent>
                        </CardActionArea>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}
              <Button
                size="small"
                sx={{ mt: 1 }}
                onClick={() => navigate('/found-items')}
              >
                查看更多招领
              </Button>
            </Grid>
          </Grid>
        </>
      )}
    </Box>
  );
}
