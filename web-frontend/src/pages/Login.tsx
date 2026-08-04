import { useState } from 'react';
import { useNavigate, useLocation, Navigate, Link as RouterLink } from 'react-router-dom';
import {
  Box, Card, CardContent, TextField, Button, Typography, Alert,
  InputAdornment, Link
} from '@mui/material';
import { Person as PersonIcon, Lock as LockIcon } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../store/AuthContext';
import { login as loginApi } from '../api/auth';
import type { ApiError } from '../types';

interface RouteState {
  from?: { pathname: string };
}

export default function Login() {
  const { t } = useTranslation();
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const from = (location.state as RouteState)?.from?.pathname || '/';

  if (user) return <Navigate to="/" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('请输入用户名和密码');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const data = await loginApi(username, password);
      login(data.token, data.user);
      navigate(from, { replace: true });
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setError(apiErr.response?.data?.message || '登录失败，请检查用户名和密码');
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
        bgcolor: 'grey.100',
      }}
    >
      <Card sx={{ width: 400, maxWidth: '90vw', p: 2 }}>
        <CardContent>
          <Typography variant="h5" align="center" gutterBottom>
            登录
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
              label={t('auth.username')}
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
              label={t('auth.password')}
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
              {loading ? '登录中...' : '登录'}
            </Button>
          </Box>

          <Typography variant="body2" align="center">
            还没有账号？
            <Link component={RouterLink} to="/register">
              立即注册
            </Link>
          </Typography>
          <Typography variant="body2" align="center" sx={{ mt: 1 }}>
            <Link component={RouterLink} to="/forgot-password">
              忘记密码？
            </Link>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
