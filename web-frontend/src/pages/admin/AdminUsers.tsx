import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Chip, IconButton, TextField,
  Pagination, CircularProgress, Alert, Tooltip
} from '@mui/material';
import {
  Check as CheckIcon, Close as CloseIcon,
  Block as BlockIcon, Search as SearchIcon
} from '@mui/icons-material';
import { useAuth } from '../../store/AuthContext';
import { getUsers, updateUserStatus } from '../../api/admin';
import type { AdminUserPageParams } from '../../types';

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

const statusLabels: Record<string, string> = {
  ACTIVE: '正常',
  PENDING: '待审核',
  INACTIVE: '已禁用',
};

const statusColors: Record<string, 'success' | 'warning' | 'error'> = {
  ACTIVE: 'success',
  PENDING: 'warning',
  INACTIVE: 'error',
};

const roleLabels: Record<string, string> = {
  ADMIN: '管理员',
  USER: '普通用户',
};

const roleColors: Record<string, 'primary' | 'default'> = {
  ADMIN: 'primary',
  USER: 'default',
};

export default function AdminUsers() {
  const { isAdmin } = useAuth();

  const [users, setUsers] = useState<UserVO[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [keyword, setKeyword] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [actionLoading, setActionLoading] = useState<number | null>(null);

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
    } catch {
      setError('加载用户列表失败');
    } finally {
      setLoading(false);
    }
  }, [page, searchTerm]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(keyword);
      if (page !== 1) setPage(1);
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
    } catch {
      // ignore
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
      <Typography variant="h5" gutterBottom sx={{ pb: 1, mb: 3, borderBottom: 2, borderColor: 'primary.main', display: 'inline-block' }}>用户管理</Typography>

      <Box sx={{ mb: 3 }}>
        <TextField
          size="small"
          placeholder="搜索用户名或真实姓名"
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
          <Typography variant="h6" color="text.secondary">暂无用户</Typography>
        </Box>
      ) : (
        <>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>用户名</TableCell>
                  <TableCell>真实姓名</TableCell>
                  <TableCell>角色</TableCell>
                  <TableCell>邮箱</TableCell>
                  <TableCell>状态</TableCell>
                  <TableCell>注册时间</TableCell>
                  <TableCell>操作</TableCell>
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
                            <Tooltip title="通过">
                              <IconButton
                                color="success"
                                size="small"
                                disabled={actionLoading === u.id}
                                onClick={() => handleStatusChange(u.id, 'ACTIVE')}
                              >
                                <CheckIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="拒绝">
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
                          <Tooltip title="禁用">
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
                          <Tooltip title="启用">
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
            共 {total} 个用户
          </Typography>
        </>
      )}
    </Box>
  );
}
