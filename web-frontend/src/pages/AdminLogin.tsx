import { useState } from 'react';
import { useNavigate, Navigate, Link as RouterLink } from 'react-router-dom';
import {
  Box, Card, CardContent, TextField, Button, Typography, Alert,
  InputAdornment, Link
} from '@mui/material';
import {
  Person as PersonIcon, Lock as LockIcon,
  AdminPanelSettings as AdminPanelSettingsIcon
} from '@mui/icons-material';
import { useAuth } from '../store/AuthContext';
import { adminLogin as adminLoginApi } from '../api/auth';

export default function AdminLogin() {
  const { user, isAdmin, login } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user && isAdmin) return <Navigate to="/admin/users" replace />;
  if (user && !isAdmin) return <Navigate to="/" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('请输入用户名和密码');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const data = await adminLoginApi(username, password);
      login(data.token, data.user);
      navigate('/admin/users', { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.message || '登录失败，请检查账号权限');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'linear-gradient(135deg, #1a237e 0%, #283593 50%, #3949ab 100%)',
      }}
    >
      <Card sx={{ width: 400, maxWidth: '90vw', p: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
            <AdminPanelSettingsIcon sx={{ fontSize: 48, color: 'primary.main' }} />
          </Box>
          <Typography variant="h5" align="center" gutterBottom>
            管理员登录
          </Typography>
          <Typography variant="body2" align="center" color="text.secondary" sx={{ mb: 2 }}>
            仅限系统管理员使用
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              fullWidth
              margin="normal"
              label="用户名"
              value={username}
              onChange={e => setUsername(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start"><PersonIcon /></InputAdornment>
                  ),
                },
              }}
            />
            <TextField
              fullWidth
              margin="normal"
              type="password"
              label="密码"
              value={password}
              onChange={e => setPassword(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start"><LockIcon /></InputAdornment>
                  ),
                },
              }}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading}
            >
              {loading ? '登录中...' : '管理员登录'}
            </Button>
          </Box>

          <Typography variant="body2" align="center">
            <Link component={RouterLink} to="/login">
              普通用户登录
            </Link>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
