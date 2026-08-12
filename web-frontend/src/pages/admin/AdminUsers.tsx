import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Chip, IconButton, TextField,
  Pagination, CircularProgress, Alert, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
} from '@mui/material';
import {
  Check as CheckIcon, Close as CloseIcon,
  Block as BlockIcon, Search as SearchIcon, Delete as DeleteIcon,
} from '@mui/icons-material';
import { useAuth } from '../../store/AuthContext';
import { getUsers, updateUserStatus, deleteUser } from '../../api/admin';
import type { AdminUserPageParams } from '../../types';
import { getApiErrorMessage } from '../../api/errors';
import { useTranslation } from 'react-i18next';

interface UserVO {
  id: number;
  username: string;
  realName: string;
  role: string;
  email: string;
  phone: string;
  status: string;
  createdAt: string;
}

const statusColors: Record<string, 'success' | 'warning' | 'error'> = {
  ACTIVE: 'success',
  PENDING: 'warning',
  INACTIVE: 'error',
};

const roleColors: Record<string, 'primary' | 'default'> = {
  ADMIN: 'primary',
  STUDENT: 'default',
  TEACHER: 'default',
  USER: 'default',
};

export default function AdminUsers() {
  const { t } = useTranslation();
  const { isAdmin } = useAuth();
  const statusLabels: Record<string, string> = {
    ACTIVE: t('admin.statusActive'),
    PENDING: t('admin.statusPending'),
    INACTIVE: t('admin.statusInactive'),
  };
  const roleLabels: Record<string, string> = {
    ADMIN: t('admin.roleAdmin'),
    STUDENT: t('admin.roleStudent'),
    TEACHER: t('admin.roleTeacher'),
    USER: t('admin.roleUser'),
  };

  const [users, setUsers] = useState<UserVO[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [keyword, setKeyword] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserVO | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const pageSize = 10;

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params: AdminUserPageParams = { page, size: pageSize };
      if (searchTerm.trim()) params.keyword = searchTerm.trim();
      const data = await getUsers(params);
      setUsers(data.records || []);
      setTotal(data.total || 0);
      setTotalPages(Math.ceil((data.total || 0) / pageSize) || 1);
    } catch (errorValue) {
      setError(getApiErrorMessage(errorValue, t('admin.loadUsersFailed')));
    } finally {
      setLoading(false);
    }
  }, [page, searchTerm, t]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(keyword);
      setPage(previous => previous === 1 ? previous : 1);
    }, 500);
    return () => clearTimeout(timer);
  }, [keyword]);

  const handleStatusChange = async (id: number, status: string) => {
    setActionLoading(id);
    try {
      await updateUserStatus(id, status);
      setUsers(prev =>
        prev.map(u => (u.id === id ? { ...u, status } : u))
      );
    } catch (errorValue) {
      setError(getApiErrorMessage(errorValue, t('admin.updateStatusFailed')));
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteUser(deleteTarget.id);
      setUsers(prev => prev.filter(u => u.id !== deleteTarget.id));
      setDeleteOpen(false);
      setDeleteTarget(null);
    } catch (errorValue) {
      setError(getApiErrorMessage(errorValue, t('admin.deleteUserFailed')));
    } finally {
      setDeleting(false);
    }
  };

  if (!isAdmin) {
    return (
      <Box sx={{ textAlign: 'center', py: 6 }}>
        <Typography variant="h6" color="text.secondary">{t('admin.noPermission')}</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ pb: 1, mb: 3, borderBottom: 2, borderColor: 'primary.main', display: 'inline-block' }}>{t('admin.usersTitle')}</Typography>

      <Box sx={{ mb: 3 }}>
        <TextField
          size="small"
          placeholder={t('admin.searchUsersPlaceholder')}
          value={keyword}
          onChange={e => setKeyword(e.target.value)}
          slotProps={{
            input: {
              startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
            },
          }}
          sx={{ minWidth: 300 }}
        />
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : users.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <Typography variant="h6" color="text.secondary">{t('admin.noUsers')}</Typography>
        </Box>
      ) : (
        <>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>{t('admin.username')}</TableCell>
                  <TableCell>{t('admin.realName')}</TableCell>
                  <TableCell>{t('admin.role')}</TableCell>
                  <TableCell>{t('admin.email')}</TableCell>
                  <TableCell>{t('admin.status')}</TableCell>
                  <TableCell>{t('admin.createdAt')}</TableCell>
                  <TableCell>{t('admin.actions')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map(u => (
                  <TableRow key={u.id}>
                    <TableCell>{u.id}</TableCell>
                    <TableCell>{u.username}</TableCell>
                    <TableCell>{u.realName}</TableCell>
                    <TableCell>
                      <Chip
                        label={roleLabels[u.role] || u.role}
                        size="small"
                        color={roleColors[u.role] || 'default'}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{u.email || '-'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={statusLabels[u.status] || u.status}
                        size="small"
                        color={statusColors[u.status] || 'default'}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {new Date(u.createdAt).toLocaleString('zh-CN')}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        {u.status === 'PENDING' && (
                          <>
                            <Tooltip title={t('admin.approve')}>
                              <IconButton
                                color="success"
                                size="small"
                                disabled={actionLoading === u.id}
                                onClick={() => handleStatusChange(u.id, 'ACTIVE')}
                              >
                                <CheckIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title={t('admin.reject')}>
                              <IconButton
                                color="error"
                                size="small"
                                disabled={actionLoading === u.id}
                                onClick={() => handleStatusChange(u.id, 'INACTIVE')}
                              >
                                <CloseIcon />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                        {u.status === 'ACTIVE' && (
                          <Tooltip title={t('admin.disable')}>
                            <IconButton
                              color="warning"
                              size="small"
                              disabled={actionLoading === u.id}
                              onClick={() => handleStatusChange(u.id, 'INACTIVE')}
                            >
                              <BlockIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                        {u.status === 'INACTIVE' && (
                          <Tooltip title={t('admin.enable')}>
                            <IconButton
                              color="success"
                              size="small"
                              disabled={actionLoading === u.id}
                              onClick={() => handleStatusChange(u.id, 'ACTIVE')}
                            >
                              <CheckIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                        {u.role !== 'ADMIN' && (
                          <Tooltip title={t('admin.deleteUser')}>
                            <IconButton
                              color="error"
                              size="small"
                              disabled={actionLoading === u.id}
                              onClick={() => {
                                setDeleteTarget(u);
                                setDeleteOpen(true);
                              }}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
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
            {t('common.totalUsers', { total })}
          </Typography>
        </>
      )}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)}>
        <DialogTitle>{t('common.confirmDeleteTitle')}</DialogTitle>
        <DialogContent>
          <Typography>
            {t('admin.confirmDeleteUser', { name: deleteTarget?.realName || deleteTarget?.username })}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)}>{t('common.cancel')}</Button>
          <Button variant="contained" color="error" onClick={handleDelete} disabled={deleting}>
            {deleting ? t('common.deleting') : t('admin.deleteUser')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
