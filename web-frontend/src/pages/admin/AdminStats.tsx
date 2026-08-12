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
import { useTranslation } from 'react-i18next';

interface StatsData {
  lostCount?: number;
  foundCount?: number;
  claimedCount?: number;
  foundLostCount?: number;
  pendingUserCount?: number;
  todayLostCount?: number;
  todayFoundCount?: number;
  totalClaims?: number;
  pendingClaims?: number;
  claimConversionRate?: number;
  avgResolveHours?: number | null;
  categoryStats?: Array<{ name: string; lostCount: number; foundCount: number }>;
}


export default function AdminStats() {
  const { t } = useTranslation();
  const { isAdmin } = useAuth();
  const theme = useTheme();

  interface StatCard {
    key: Exclude<keyof StatsData, 'categoryStats'>;
    label: string;
    icon: React.ReactElement;
    color: string;
    format?: (value: number | null | undefined) => string;
  }

  const statCards: StatCard[] = [
    { key: 'lostCount' as const, label: t('admin.lostTotal'), icon: <LostIcon fontSize="large" />, color: theme.palette.primary.main },
    { key: 'foundCount' as const, label: t('admin.foundTotal'), icon: <FoundIcon fontSize="large" />, color: theme.palette.success.main },
    { key: 'claimedCount' as const, label: t('admin.claimedCount'), icon: <ClaimedIcon fontSize="large" />, color: theme.palette.warning.main },
    { key: 'foundLostCount' as const, label: t('admin.foundLostCount'), icon: <FoundLostIcon fontSize="large" />, color: theme.palette.secondary.main },
    { key: 'pendingUserCount' as const, label: t('admin.pendingUsers'), icon: <PendingIcon fontSize="large" />, color: theme.palette.primary.dark },
    { key: 'totalClaims' as const, label: t('admin.totalClaims'), icon: <ClaimedIcon fontSize="large" />, color: theme.palette.info.main },
    { key: 'pendingClaims' as const, label: t('admin.pendingClaims'), icon: <PendingIcon fontSize="large" />, color: theme.palette.warning.dark },
    { key: 'claimConversionRate' as const, label: t('admin.claimConversionRate'), icon: <ClaimedIcon fontSize="large" />, color: theme.palette.success.dark, format: (value) => (value == null ? '0%' : `${value}%`) },
    { key: 'avgResolveHours' as const, label: t('admin.avgResolveHours'), icon: <FoundLostIcon fontSize="large" />, color: theme.palette.secondary.dark, format: (value) => (value == null ? '—' : `${value}h`) },
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
        setError(getApiErrorMessage(errorValue, t('admin.loadStatsFailed')));
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [t]);

  useEffect(() => {
    getTrend(trendDays)
      .then(setTrend)
      .catch(errorValue => {
        setTrend([]);
        setError(getApiErrorMessage(errorValue, t('admin.loadTrendFailed')));
      });
  }, [trendDays, t]);

  if (!isAdmin) {
    return (
      <Box sx={{ textAlign: 'center', py: 6 }}>
        <Typography variant="h6" color="text.secondary">{t('admin.noPermission')}</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ pb: 1, mb: 3, borderBottom: 2, borderColor: 'primary.main', display: 'inline-block' }}>{t('admin.statsTitle')}</Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : !stats ? (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <Typography variant="h6" color="text.secondary">{t('admin.noData')}</Typography>
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
                    {card.format ? card.format(stats[card.key]) : stats[card.key] ?? 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">{card.label}</Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>

          {/* Category Distribution */}
          {stats.categoryStats && stats.categoryStats.length > 0 && (
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>{t('admin.categoryDistribution')}</Typography>

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
                      <TableCell>{t('admin.categoryName')}</TableCell>
                      <TableCell align="right">{t('admin.lost')}</TableCell>
                      <TableCell align="right">{t('admin.found')}</TableCell>
                      <TableCell align="right">{t('admin.total')}</TableCell>
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
              <Typography variant="h6">{t('admin.trend')}</Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button size="small" variant={trendDays === 7 ? 'contained' : 'outlined'}
                  onClick={() => setTrendDays(7)}>{t('admin.last7Days')}</Button>
                <Button size="small" variant={trendDays === 30 ? 'contained' : 'outlined'}
                  onClick={() => setTrendDays(30)}>{t('admin.last30Days')}</Button>
              </Box>
            </Box>
            {trend.length === 0 ? (
              <Typography variant="body2" color="text.secondary">{t('admin.noTrend')}</Typography>
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
                        <Tooltip title={`${t('admin.lost')} ${item.lostCount}`}>
                          <Box sx={{ width: 8, bgcolor: 'primary.main', borderRadius: '2px 2px 0 0', height: lostH }} />
                        </Tooltip>
                        <Tooltip title={`${t('admin.found')} ${item.foundCount}`}>
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
