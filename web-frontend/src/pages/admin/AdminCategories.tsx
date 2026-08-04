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
import type { ApiError } from '../../types';

export default function AdminCategories() {
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
    } catch {
      setError('加载分类列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

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
      setDialogError('请输入分类名称');
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
      const apiErr = err as ApiError;
      setDialogError(apiErr.response?.data?.message || '操作失败');
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
      const apiErr = err as ApiError;
      setError(apiErr.response?.data?.message || '删除失败');
    } finally {
      setActionLoading(null);
    }
  };

  if (!isAdmin) {
    return (
      <Box sx={{ textAlign: 'center', py: 6 }}>
        <Typography variant="h6" color="text.secondary">无权限访问</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ pb: 1, borderBottom: 2, borderColor: 'primary.main', display: 'inline-block' }}>分类管理</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateDialog}>
          新增分类
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : categories.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <Typography variant="h6" color="text.secondary">暂无分类</Typography>
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>分类名称</TableCell>
                <TableCell>排序</TableCell>
                <TableCell>操作</TableCell>
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
                      <Tooltip title="编辑">
                        <IconButton
                          size="small"
                          onClick={() => openEditDialog(cat)}
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="删除">
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
        <DialogTitle>{editingCategory ? '编辑分类' : '新增分类'}</DialogTitle>
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
            label="分类名称"
            value={dialogName}
            onChange={e => setDialogName(e.target.value)}
          />
          <TextField
            fullWidth
            margin="normal"
            label="排序"
            type="number"
            value={dialogSortOrder}
            onChange={e => setDialogSortOrder(Number(e.target.value))}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={dialogLoading}>取消</Button>
          <Button variant="contained" onClick={handleDialogSubmit} disabled={dialogLoading}>
            {dialogLoading ? '保存中...' : '保存'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirm Delete Dialog */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)}>
        <DialogTitle>确认删除</DialogTitle>
        <DialogContent>
          <Typography>
            确定要删除分类「{deleteTarget?.name}」吗？此操作不可撤销。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)}>取消</Button>
          <Button variant="contained" color="error" onClick={handleDelete}>删除</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
