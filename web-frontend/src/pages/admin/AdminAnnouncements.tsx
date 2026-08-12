import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Button, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Chip, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, FormControlLabel, Checkbox,
  Pagination, CircularProgress, Alert, Tooltip,
} from '@mui/material';
import {
  Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon,
  PushPin as PinIcon,
} from '@mui/icons-material';
import { useAuth } from '../../store/AuthContext';
import {
  getAdminAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement,
} from '../../api/admin';
import type { AdminAnnouncement } from '../../api/admin';
import { getApiErrorMessage } from '../../api/errors';
import { useTranslation } from 'react-i18next';

export default function AdminAnnouncements() {
  const { t } = useTranslation();
  const { isAdmin } = useAuth();

  const [announcements, setAnnouncements] = useState<AdminAnnouncement[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AdminAnnouncement | null>(null);
  const [dialogTitle, setDialogTitle] = useState('');
  const [dialogContent, setDialogContent] = useState('');
  const [dialogPinned, setDialogPinned] = useState(false);
  const [dialogActive, setDialogActive] = useState(true);
  const [dialogError, setDialogError] = useState('');
  const [dialogLoading, setDialogLoading] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminAnnouncement | null>(null);

  const pageSize = 10;

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getAdminAnnouncements({ page, size: pageSize });
      setAnnouncements(data.records || []);
      setTotal(data.total || 0);
      setTotalPages(Math.ceil((data.total || 0) / pageSize) || 1);
    } catch (errorValue) {
      setError(getApiErrorMessage(errorValue, t('admin.loadAnnouncementsFailed')));
    } finally {
      setLoading(false);
    }
  }, [page, t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openCreate = () => {
    setEditing(null);
    setDialogTitle('');
    setDialogContent('');
    setDialogPinned(false);
    setDialogActive(true);
    setDialogError('');
    setDialogOpen(true);
  };

  const openEdit = (item: AdminAnnouncement) => {
    setEditing(item);
    setDialogTitle(item.title);
    setDialogContent(item.content);
    setDialogPinned(Boolean(item.isPinned));
    setDialogActive(Boolean(item.isActive));
    setDialogError('');
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!dialogTitle.trim()) {
      setDialogError(t('admin.enterAnnouncementTitle'));
      return;
    }
    if (!dialogContent.trim()) {
      setDialogError(t('admin.enterAnnouncementContent'));
      return;
    }
    setDialogLoading(true);
    setDialogError('');
    const payload = {
      title: dialogTitle.trim(),
      content: dialogContent.trim(),
      isPinned: dialogPinned,
      isActive: dialogActive,
    };
    try {
      if (editing) {
        await updateAnnouncement(editing.id, payload);
      } else {
        await createAnnouncement(payload);
      }
      setDialogOpen(false);
      fetchData();
    } catch (errorValue) {
      setDialogError(getApiErrorMessage(errorValue, t('admin.saveAnnouncementFailed')));
    } finally {
      setDialogLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setActionLoading(deleteTarget.id);
    try {
      await deleteAnnouncement(deleteTarget.id);
      setAnnouncements(prev => prev.filter(item => item.id !== deleteTarget.id));
      setDeleteOpen(false);
      setDeleteTarget(null);
    } catch (errorValue) {
      setError(getApiErrorMessage(errorValue, t('admin.deleteAnnouncementFailed')));
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

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ pb: 1, borderBottom: 2, borderColor: 'primary.main', display: 'inline-block' }}>
          {t('admin.announcementsTitle')}
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
          {t('admin.addAnnouncement')}
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : announcements.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <Typography variant="h6" color="text.secondary">{t('admin.noAnnouncements')}</Typography>
        </Box>
      ) : (
        <>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>{t('admin.announcementTitle')}</TableCell>
                  <TableCell>{t('admin.pinned')}</TableCell>
                  <TableCell>{t('admin.status')}</TableCell>
                  <TableCell>{t('admin.publishTime')}</TableCell>
                  <TableCell>{t('admin.actions')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {announcements.map(item => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Typography variant="body1" noWrap sx={{ maxWidth: 320 }}>{item.title}</Typography>
                    </TableCell>
                    <TableCell>
                      {item.isPinned
                        ? <Chip icon={<PinIcon />} label={t('admin.pinned')} size="small" color="primary" variant="outlined" />
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={item.isActive ? t('admin.published') : t('admin.unpublished')}
                        size="small"
                        color={item.isActive ? 'success' : 'default'}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {new Date(item.createdAt).toLocaleString('zh-CN')}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Tooltip title={t('common.edit')}>
                          <IconButton size="small" onClick={() => openEdit(item)}>
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={t('common.delete')}>
                          <IconButton
                            size="small"
                            color="error"
                            disabled={actionLoading === item.id}
                            onClick={() => {
                              setDeleteTarget(item);
                              setDeleteOpen(true);
                            }}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
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

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? t('admin.editAnnouncement') : t('admin.addAnnouncement')}</DialogTitle>
        <DialogContent>
          {dialogError && <Alert severity="error" sx={{ mb: 2 }}>{dialogError}</Alert>}
          <TextField
            autoFocus
            fullWidth
            margin="normal"
            label={t('admin.announcementTitle')}
            value={dialogTitle}
            onChange={event => setDialogTitle(event.target.value)}
          />
          <TextField
            fullWidth
            margin="normal"
            label={t('admin.announcementContent')}
            value={dialogContent}
            onChange={event => setDialogContent(event.target.value)}
            multiline
            minRows={4}
          />
          <FormControlLabel
            control={<Checkbox checked={dialogPinned} onChange={event => setDialogPinned(event.target.checked)} />}
            label={t('admin.pinned')}
          />
          <FormControlLabel
            control={<Checkbox checked={dialogActive} onChange={event => setDialogActive(event.target.checked)} />}
            label={t('admin.active')}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={dialogLoading}>{t('common.cancel')}</Button>
          <Button variant="contained" onClick={handleSubmit} disabled={dialogLoading}>
            {dialogLoading ? t('common.saving') : t('common.save')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)}>
        <DialogTitle>{t('common.confirmDeleteTitle')}</DialogTitle>
        <DialogContent>
          <Typography>
            {t('admin.confirmDeleteAnnouncement', { title: deleteTarget?.title })}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)}>{t('common.cancel')}</Button>
          <Button variant="contained" color="error" onClick={handleDelete}>
            {t('common.delete')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
