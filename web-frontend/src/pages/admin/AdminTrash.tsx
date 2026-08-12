import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Tabs, Tab, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Chip, IconButton, Button, TextField,
  Dialog, DialogTitle, DialogContent, DialogActions, Pagination,
  CircularProgress, Alert, Tooltip,
} from '@mui/material';
import {
  Restore as RestoreIcon, DeleteForever as PurgeIcon,
} from '@mui/icons-material';
import { useAuth } from '../../store/AuthContext';
import {
  getTrashLostItems, getTrashFoundItems, getTrashUsers,
  restoreLostItem, purgeLostItem, restoreFoundItem, purgeFoundItem, restoreUser,
} from '../../api/admin';
import { getApiErrorMessage } from '../../api/errors';
import { useTranslation } from 'react-i18next';

interface TrashUser {
  id: number;
  username: string;
  realName: string;
  role: string;
  email: string;
  deletedAt?: string;
}

interface TrashItemRow {
  id: number;
  title: string;
  deletedAt?: string;
}

type TrashEntry = TrashItemRow | TrashUser;

export default function AdminTrash() {
  const { t } = useTranslation();
  const { isAdmin } = useAuth();

  const [tab, setTab] = useState(0);
  const [records, setRecords] = useState<TrashEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [keyword, setKeyword] = useState('');
  const [queryKeyword, setQueryKeyword] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [purgeTarget, setPurgeTarget] = useState<TrashItemRow | null>(null);
  const [purgeOpen, setPurgeOpen] = useState(false);

  const pageSize = 10;

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { page, size: pageSize, keyword: queryKeyword.trim() || undefined };
      const data = tab === 0
        ? await getTrashLostItems(params)
        : tab === 1
          ? await getTrashFoundItems(params)
          : await getTrashUsers(params);
      setRecords(data.records || []);
      setTotal(data.total || 0);
      setTotalPages(Math.ceil((data.total || 0) / pageSize) || 1);
    } catch (errorValue) {
      setError(getApiErrorMessage(errorValue, t('admin.loadTrashFailed')));
    } finally {
      setLoading(false);
    }
  }, [tab, page, queryKeyword, t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleTabChange = (_: React.SyntheticEvent, value: number) => {
    setTab(value);
    setPage(1);
    setKeyword('');
    setQueryKeyword('');
  };

  const applySearch = () => {
    setQueryKeyword(keyword);
    setPage(1);
  };

  const handleRestore = async (entry: TrashEntry) => {
    const key = `${tab}-${entry.id}`;
    setActionLoading(key);
    try {
      if (tab === 0) await restoreLostItem(entry.id);
      else if (tab === 1) await restoreFoundItem(entry.id);
      else await restoreUser(entry.id);
      fetchData();
    } catch (errorValue) {
      setError(getApiErrorMessage(errorValue, t('admin.restoreFailed')));
    } finally {
      setActionLoading(null);
    }
  };

  const handlePurge = async () => {
    if (!purgeTarget) return;
    const key = `${tab}-${purgeTarget.id}`;
    setActionLoading(key);
    try {
      if (tab === 0) await purgeLostItem(purgeTarget.id);
      else await purgeFoundItem(purgeTarget.id);
      setPurgeOpen(false);
      setPurgeTarget(null);
      fetchData();
    } catch (errorValue) {
      setError(getApiErrorMessage(errorValue, t('admin.purgeFailed')));
    } finally {
      setActionLoading(null);
    }
  };

  if (!isAdmin) {
    return (
      <Box sx={{ textAlign: 'center', py: 6 }}>
        <Typography variant="h6" color="text.secondary">{t('admin.noPermission')}</Typography>
      </Box>
    );
  }

  const isItemTab = tab !== 2;

  return (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ pb: 1, mb: 3, borderBottom: 2, borderColor: 'primary.main', display: 'inline-block' }}>
        {t('admin.trashTitle')}
      </Typography>

      <Tabs value={tab} onChange={handleTabChange} sx={{ mb: 2 }}>
        <Tab label={t('admin.trashLost')} />
        <Tab label={t('admin.trashFound')} />
        <Tab label={t('admin.trashUsers')} />
      </Tabs>

      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <TextField
          size="small"
          placeholder={t('items.keyword')}
          value={keyword}
          onChange={event => setKeyword(event.target.value)}
          onKeyDown={event => { if (event.key === 'Enter') applySearch(); }}
          sx={{ minWidth: 240 }}
        />
        <Button variant="contained" size="small" onClick={applySearch}>{t('common.search')}</Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : records.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <Typography variant="h6" color="text.secondary">{t('admin.noTrash')}</Typography>
        </Box>
      ) : (
        <>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  {isItemTab ? (
                    <>
                      <TableCell>{tab === 0 ? t('admin.trashLost') : t('admin.trashFound')}</TableCell>
                      <TableCell>{t('admin.deletedAt')}</TableCell>
                      <TableCell>{t('admin.actions')}</TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell>{t('admin.username')}</TableCell>
                      <TableCell>{t('admin.realName')}</TableCell>
                      <TableCell>{t('admin.role')}</TableCell>
                      <TableCell>{t('admin.email')}</TableCell>
                      <TableCell>{t('admin.deletedAt')}</TableCell>
                      <TableCell>{t('admin.actions')}</TableCell>
                    </>
                  )}
                </TableRow>
              </TableHead>
              <TableBody>
                {records.map(entry => {
                  const key = `${tab}-${entry.id}`;
                  return (
                    <TableRow key={key}>
                      {isItemTab ? (
                        <>
                          <TableCell>
                            <Typography variant="body1" noWrap sx={{ maxWidth: 320 }}>
                              {(entry as TrashItemRow).title}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">
                              {entry.deletedAt ? new Date(entry.deletedAt).toLocaleString('zh-CN') : '-'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                              <Tooltip title={t('admin.restore')}>
                                <IconButton size="small" color="primary"
                                  disabled={actionLoading === key}
                                  onClick={() => handleRestore(entry)}>
                                  <RestoreIcon />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title={t('admin.purge')}>
                                <IconButton size="small" color="error"
                                  disabled={actionLoading === key}
                                  onClick={() => {
                                    setPurgeTarget(entry as TrashItemRow);
                                    setPurgeOpen(true);
                                  }}>
                                  <PurgeIcon />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </TableCell>
                        </>
                      ) : (
                        <>
                          <TableCell>{(entry as TrashUser).username}</TableCell>
                          <TableCell>{(entry as TrashUser).realName || '-'}</TableCell>
                          <TableCell>
                            <Chip label={(entry as TrashUser).role || '-'} size="small" variant="outlined" />
                          </TableCell>
                          <TableCell>{(entry as TrashUser).email || '-'}</TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">
                              {entry.deletedAt ? new Date(entry.deletedAt).toLocaleString('zh-CN') : '-'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Tooltip title={t('admin.restore')}>
                              <IconButton size="small" color="primary"
                                disabled={actionLoading === key}
                                onClick={() => handleRestore(entry)}>
                                <RestoreIcon />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={(_, value) => setPage(value)}
                color="primary"
              />
            </Box>
          )}
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>
            {t('common.records', { total })}
          </Typography>
        </>
      )}

      <Dialog open={purgeOpen} onClose={() => setPurgeOpen(false)}>
        <DialogTitle>{t('common.confirmDeleteTitle')}</DialogTitle>
        <DialogContent>
          <Typography>
            {t('admin.confirmPurge', { title: purgeTarget?.title })}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPurgeOpen(false)}>{t('common.cancel')}</Button>
          <Button variant="contained" color="error" onClick={handlePurge}>
            {t('admin.purge')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
