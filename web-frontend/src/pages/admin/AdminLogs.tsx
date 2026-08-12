import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Pagination, CircularProgress, Alert, TextField, Button, Snackbar
} from '@mui/material';
import { Download as DownloadIcon } from '@mui/icons-material';
import { useAuth } from '../../store/AuthContext';
import { getLogs, exportLogs } from '../../api/admin';
import { getApiErrorMessage } from '../../api/errors';
import { useTranslation } from 'react-i18next';

interface LogVO {
  id: number;
  userId: number;
  action: string;
  targetType: string;
  targetId: number;
  description: string;
  ip: string;
  createdAt: string;
}

export default function AdminLogs() {
  const { t } = useTranslation();
  const { isAdmin } = useAuth();

  const [logs, setLogs] = useState<LogVO[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [userIdFilter, setUserIdFilter] = useState('');
  const [queryAction, setQueryAction] = useState('');
  const [queryUserId, setQueryUserId] = useState<number | undefined>(undefined);
  const [exporting, setExporting] = useState(false);
  const [exported, setExported] = useState(false);

  const pageSize = 15;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getLogs({
        page,
        size: pageSize,
        action: queryAction || undefined,
        userId: queryUserId,
      });
      setLogs(data.records || []);
      setTotal(data.total || 0);
      setTotalPages(Math.ceil((data.total || 0) / pageSize) || 1);
    } catch (errorValue) {
      setError(getApiErrorMessage(errorValue, t('admin.loadLogsFailed')));
    } finally {
      setLoading(false);
    }
  }, [page, queryAction, queryUserId, t]);

  const resetFilters = () => {
    setActionFilter('');
    setUserIdFilter('');
    setQueryAction('');
    setQueryUserId(undefined);
    setPage(1);
  };

  const applyFilters = () => {
    setQueryAction(actionFilter.trim());
    setQueryUserId(userIdFilter.trim() ? Number(userIdFilter.trim()) : undefined);
    setPage(1);
  };

  const handleExport = async () => {
    setExporting(true);
    setError('');
    try {
      await exportLogs();
      setExported(true);
    } catch (errorValue) {
      setError(getApiErrorMessage(errorValue, t('admin.exportLogsFailed')));
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  if (!isAdmin) {
    return (
      <Box sx={{ textAlign: 'center', py: 6 }}>
        <Typography variant="h6" color="text.secondary">{t('admin.noPermission')}</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ pb: 1, mb: 3, borderBottom: 2, borderColor: 'primary.main', display: 'inline-block' }}>{t('admin.logsTitle')}</Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper sx={{ p: 2, mb: 2, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <TextField
          size="small"
          label={t('admin.actionType')}
          placeholder={t('admin.actionPlaceholder')}
          value={actionFilter}
          onChange={e => setActionFilter(e.target.value)}
        />
        <TextField
          size="small"
          label={t('admin.userId')}
          value={userIdFilter}
          onChange={e => setUserIdFilter(e.target.value.replace(/\D/g, ''))}
          sx={{ width: 140 }}
        />
        <Button variant="contained" size="small" onClick={applyFilters}>{t('admin.query')}</Button>
        <Button variant="outlined" size="small" onClick={resetFilters}>{t('common.reset')}</Button>
        <Button
          variant="outlined"
          size="small"
          startIcon={<DownloadIcon />}
          onClick={handleExport}
          disabled={exporting}
          sx={{ ml: 'auto' }}
        >
          {t('admin.exportLogs')}
        </Button>
      </Paper>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : logs.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <Typography variant="h6" color="text.secondary">{t('admin.noLogs')}</Typography>
        </Box>
      ) : (
        <>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>{t('admin.userId')}</TableCell>
                  <TableCell>{t('admin.action')}</TableCell>
                  <TableCell>{t('admin.targetType')}</TableCell>
                  <TableCell>{t('admin.targetId')}</TableCell>
                  <TableCell>{t('admin.description')}</TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>IP</TableCell>
                  <TableCell>{t('admin.time')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {logs.map(log => (
                  <TableRow key={log.id}>
                    <TableCell>{log.id}</TableCell>
                    <TableCell>{log.userId}</TableCell>
                    <TableCell>
                      <Typography variant="body2">{log.action}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{log.targetType || '-'}</Typography>
                    </TableCell>
                    <TableCell>{log.targetId || '-'}</TableCell>
                    <TableCell>
                      <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                        {log.description || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                      <Typography variant="body2" color="text.secondary">
                        {log.ip || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {new Date(log.createdAt).toLocaleString('zh-CN')}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={(_, v) => setPage(v)}
                color="primary"
              />
            </Box>
          )}

          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>
            {t('common.records', { total })}
          </Typography>
        </>
      )}
      <Snackbar
        open={exported}
        autoHideDuration={3000}
        onClose={() => setExported(false)}
        message={t('admin.exportLogsSuccess')}
      />
    </Box>
  );
}
