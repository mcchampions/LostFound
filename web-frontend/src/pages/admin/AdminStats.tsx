import { useState, useEffect } from 'react';
import { useTheme } from '@mui/material/styles';
import {
  Box, Typography, Paper, Grid, CircularProgress, Alert,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button, Tooltip
} from '@mui/material';
import {
  Search as LostIcon,
  Add as FoundIcon,
  CheckCircle as ClaimedIcon,
  FindInPage as FoundLostIcon,
  Pending as PendingIcon
} from '@mui/icons-material';
import { useAuth } from '../../store/AuthContext';
import { getStats, getTrend } from '../../api/admin';
import { getApiErrorMessage } from '../../api/errors';

interface StatsData {
  lostCount?: number;
  foundCount?: number;
  claimedCount?: number;
  foundLostCount?: number;
  pendingUserCount?: number;
  categoryStats?: Array<{ name: string; lostCount: number; foundCount: number }>;
}


export default function AdminStats() {
  const { isAdmin } = useAuth();
  const theme = useTheme();

  const statCards = [
    { key: 'lostCount' as const, label: '失物总数', icon: <LostIcon fontSize="large" />, color: theme.palette.primary.main },
    { key: 'foundCount' as const, label: '招领总数', icon: <FoundIcon fontSize="large" />, color: theme.palette.success.main },
    { key: 'claimedCount' as const, label: '已认领数', icon: <ClaimedIcon fontSize="large" />, color: theme.palette.warning.main },
    { key: 'foundLostCount' as const, label: '已找回失物', icon: <FoundLostIcon fontSize="large" />, color: theme.palette.secondary.main },
    { key: 'pendingUserCount' as const, label: '待审核用户', icon: <PendingIcon fontSize="large" />, color: theme.palette.primary.dark },
  ];

  const chartColors = [
    theme.palette.primary.main,
    theme.palette.success.main,
    theme.palette.warning.main,
    theme.palette.secondary.main,
    theme.palette.primary.dark,
    '#0097a7', '#f57c00', '#388e3c', '#7b1fa2', theme.palette.primary.light,
  ];

  const [stats, setStats] = useState<StatsData | null>(null);
  const [trendDays, setTrendDays] = useState(7);
  const [trend, setTrend] = useState<Array<{ date: string; lostCount: number; foundCount: number }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await getStats();
        setStats(data);
      } catch (errorValue) {
        setError(getApiErrorMessage(errorValue, '加载统计数据失败'));
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  useEffect(() => {
    getTrend(trendDays)
      .then(setTrend)
      .catch(errorValue => {
        setTrend([]);
        setError(getApiErrorMessage(errorValue, '加载趋势数据失败'));
      });
  }, [trendDays]);

  if (!isAdmin) {
    return (
      <Box sx={{ textAlign: 'center', py: 6 }}>
        <Typography variant="h6" color="text.secondary">无权限访问</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ pb: 1, mb: 3, borderBottom: 2, borderColor: 'primary.main', display: 'inline-block' }}>数据统计</Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : !stats ? (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <Typography variant="h6" color="text.secondary">暂无数据</Typography>
        </Box>
      ) : (
        <>
          {/* Overview Cards */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            {statCards.map((card) => (
              <Grid size={{ xs: 6, sm: 4, md: 2.4 }} key={card.key}>
                <Paper
                  sx={{
                    p: 3,
                    textAlign: 'center',
                    borderTop: 4,
                    borderColor: card.color,
                    height: '100%',
                  }}
                >
                  <Box sx={{ color: card.color, mb: 1 }}>{card.icon}</Box>
                  <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                    {stats[card.key] ?? 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">{card.label}</Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>

          {/* Category Distribution */}
          {stats.categoryStats && stats.categoryStats.length > 0 && (
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>分类分布</Typography>

              {/* Horizontal bar chart */}
              <Box sx={{ mb: 3 }}>
                {(() => {
                  const maxCount = Math.max(
                    ...stats.categoryStats.map(c => (c.lostCount || 0) + (c.foundCount || 0)),
                    1
                  );
                  return stats.categoryStats.map((cat, idx) => (
                    <Box key={cat.name} sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                      <Typography variant="body2" sx={{ minWidth: 80, mr: 2 }}>
                        {cat.name}
                      </Typography>
                      <Box sx={{ flexGrow: 1, mr: 2 }}>
                          <Box
                            sx={{
                              height: 24,
                              borderRadius: 1,
                              bgcolor: chartColors[idx % chartColors.length],
                              width: `${Math.max(((cat.lostCount || 0) + (cat.foundCount || 0)) / maxCount * 100, 2)}%`,
                              minWidth: 4,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'flex-end',
                            px: 1,
                          }}
                        >
                          {(cat.lostCount || 0) + (cat.foundCount || 0) > 0 && (
                            <Typography variant="caption" sx={{ color: '#fff', fontWeight: 'bold' }}>
                              {(cat.lostCount || 0) + (cat.foundCount || 0)}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </Box>
                  ));
                })()}
              </Box>

              {/* Table view */}
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>分类名称</TableCell>
                      <TableCell align="right">失物</TableCell>
                      <TableCell align="right">招领</TableCell>
                      <TableCell align="right">合计</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {stats.categoryStats.map(cat => (
                      <TableRow key={cat.name}>
                        <TableCell>{cat.name}</TableCell>
                        <TableCell align="right">{cat.lostCount || 0}</TableCell>
                        <TableCell align="right">{cat.foundCount || 0}</TableCell>
                        <TableCell align="right">{(cat.lostCount || 0) + (cat.foundCount || 0)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          )}

          {/* 近 7/30 天发布趋势 */}
          <Paper sx={{ p: 3, mt: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">发布趋势</Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button size="small" variant={trendDays === 7 ? 'contained' : 'outlined'}
                  onClick={() => setTrendDays(7)}>近7天</Button>
                <Button size="small" variant={trendDays === 30 ? 'contained' : 'outlined'}
                  onClick={() => setTrendDays(30)}>近30天</Button>
              </Box>
            </Box>
            {trend.length === 0 ? (
              <Typography variant="body2" color="text.secondary">暂无趋势数据</Typography>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 0.5, height: 160, overflowX: 'auto' }}>
                {trend.map(item => {
                  const max = Math.max(...trend.map(t => Math.max(t.lostCount, t.foundCount)), 1);
                  const lostH = Math.max((item.lostCount / max) * 130, item.lostCount > 0 ? 4 : 1);
                  const foundH = Math.max((item.foundCount / max) * 130, item.foundCount > 0 ? 4 : 1);
                  return (
                    <Box key={item.date} sx={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 24, flex: 1,
                    }}>
                      <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 130 }}>
                        <Tooltip title={`失物 ${item.lostCount}`}>
                          <Box sx={{ width: 8, bgcolor: 'primary.main', borderRadius: '2px 2px 0 0', height: lostH }} />
                        </Tooltip>
                        <Tooltip title={`招领 ${item.foundCount}`}>
                          <Box sx={{ width: 8, bgcolor: 'success.main', borderRadius: '2px 2px 0 0', height: foundH }} />
                        </Tooltip>
                      </Box>
                      <Typography variant="caption" sx={{ mt: 0.5, color: 'text.secondary', fontSize: 10 }}>
                        {item.date.slice(5)}
                      </Typography>
                    </Box>
                  );
                })}
              </Box>
            )}
          </Paper>
        </>
      )}
    </Box>
  );
}
