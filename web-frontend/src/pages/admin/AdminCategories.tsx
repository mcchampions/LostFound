import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Button, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, CircularProgress, Alert, Tooltip
} from '@mui/material';
import {
  Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon
} from '@mui/icons-material';
import { useAuth } from '../../store/AuthContext';
import { getCategories } from '../../api/categories';
import type { Category } from '../../api/categories';
import { createCategory, updateCategory, deleteCategory } from '../../api/admin';
import { getApiErrorMessage } from '../../api/errors';
import { useTranslation } from 'react-i18next';

export default function AdminCategories() {
  const { t } = useTranslation();
  const { isAdmin } = useAuth();

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [dialogName, setDialogName] = useState('');
  const [dialogSortOrder, setDialogSortOrder] = useState(0);
  const [dialogError, setDialogError] = useState('');
  const [dialogLoading, setDialogLoading] = useState(false);

  // Confirm delete state
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getCategories();
      setCategories(data || []);
    } catch (errorValue) {
      setError(getApiErrorMessage(errorValue, t('admin.loadCategoriesFailed')));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openCreateDialog = () => {
    setEditingCategory(null);
    setDialogName('');
    setDialogSortOrder(0);
    setDialogError('');
    setDialogOpen(true);
  };

  const openEditDialog = (cat: Category) => {
    setEditingCategory(cat);
    setDialogName(cat.name);
    setDialogSortOrder(cat.sortOrder);
    setDialogError('');
    setDialogOpen(true);
  };

  const handleDialogSubmit = async () => {
    if (!dialogName.trim()) {
      setDialogError(t('admin.enterCategoryName'));
      return;
    }
    setDialogLoading(true);
    setDialogError('');
    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, dialogName.trim(), dialogSortOrder);
      } else {
        await createCategory(dialogName.trim(), dialogSortOrder);
      }
      setDialogOpen(false);
      fetchData();
    } catch (err: unknown) {
      setDialogError(getApiErrorMessage(err, t('items.operationFailed')));
    } finally {
      setDialogLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setActionLoading(deleteTarget.id);
    try {
      await deleteCategory(deleteTarget.id);
      setCategories(prev => prev.filter(c => c.id !== deleteTarget.id));
      setDeleteOpen(false);
      setDeleteTarget(null);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, t('items.deleteFailed')));
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
        <Typography variant="h5" sx={{ pb: 1, borderBottom: 2, borderColor: 'primary.main', display: 'inline-block' }}>{t('admin.categoriesTitle')}</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateDialog}>
          {t('admin.addCategory')}
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : categories.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <Typography variant="h6" color="text.secondary">{t('admin.noCategories')}</Typography>
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>{t('admin.categoryName')}</TableCell>
                <TableCell>{t('admin.sortOrder')}</TableCell>
                <TableCell>{t('admin.actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {categories.map(cat => (
                <TableRow key={cat.id}>
                  <TableCell>
                    <Typography variant="body1">{cat.name}</Typography>
                  </TableCell>
                  <TableCell>{cat.sortOrder}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Tooltip title={t('common.edit')}>
                        <IconButton
                          size="small"
                          onClick={() => openEditDialog(cat)}
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                        <Tooltip title={t('common.delete')}>
                        <IconButton
                          size="small"
                          color="error"
                          disabled={actionLoading === cat.id}
                          onClick={() => {
                            setDeleteTarget(cat);
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
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingCategory ? t('admin.editCategory') : t('admin.createCategory')}</DialogTitle>
        <DialogContent>
          {dialogError && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setDialogError('')}>
              {dialogError}
            </Alert>
          )}
          <TextField
            autoFocus
            fullWidth
            margin="normal"
            label={t('admin.categoryName')}
            value={dialogName}
            onChange={e => setDialogName(e.target.value)}
          />
          <TextField
            fullWidth
            margin="normal"
            label={t('admin.sortOrder')}
            type="number"
            value={dialogSortOrder}
            onChange={e => setDialogSortOrder(Number(e.target.value))}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={dialogLoading}>{t('common.cancel')}</Button>
          <Button variant="contained" onClick={handleDialogSubmit} disabled={dialogLoading}>
            {dialogLoading ? t('common.saving') : t('common.save')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirm Delete Dialog */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)}>
        <DialogTitle>{t('common.confirmDeleteTitle')}</DialogTitle>
        <DialogContent>
          <Typography>
            {t('admin.confirmDeleteCategory', { name: deleteTarget?.name })}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)}>{t('common.cancel')}</Button>
          <Button variant="contained" color="error" onClick={handleDelete}>{t('common.delete')}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
