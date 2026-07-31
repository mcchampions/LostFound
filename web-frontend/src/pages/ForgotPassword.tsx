import { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Box, Card, CardContent, TextField, Button, Typography, Alert, Link
} from '@mui/material';
import { LockReset as LockResetIcon } from '@mui/icons-material';
import { forgotPassword, resetPassword } from '../api/auth';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [step, setStep] = useState<1 | 2>(1);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('请输入注册邮箱');
      return;
    }
    setError('');
    setNotice('');
    setLoading(true);
    try {
      await forgotPassword(email.trim());
      setNotice('如果该邮箱已注册，验证码已发送，请查收邮件（5分钟内有效）');
      setStep(2);
    } catch (err: any) {
      setError(err.response?.data?.message || '发送失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      setError('请输入验证码');
      return;
    }
    if (newPassword.length < 6) {
      setError('新密码至少6位');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await resetPassword({ email: email.trim(), code: code.trim(), newPassword });
      setNotice('密码重置成功，请使用新密码登录');
      setTimeout(() => navigate('/login'), 1200);
    } catch (err: any) {
      setError(err.response?.data?.message || '重置失败，请重试');
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
          <Typography variant="h5" align="center" gutterBottom sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
            <LockResetIcon /> 找回密码
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}
          {notice && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {notice}
            </Alert>
          )}

          {step === 1 ? (
            <Box component="form" onSubmit={handleSendCode}>
              <TextField
                fullWidth margin="normal"
                type="email"
                label="注册邮箱"
                value={email}
                onChange={e => setEmail(e.target.value)}
                helperText="重置验证码将发送到该邮箱"
              />
              <Button type="submit" fullWidth variant="contained" sx={{ mt: 2 }} disabled={loading}>
                {loading ? '发送中...' : '发送验证码'}
              </Button>
            </Box>
          ) : (
            <Box component="form" onSubmit={handleReset}>
              <TextField
                fullWidth margin="normal"
                label="邮箱"
                value={email}
                disabled
              />
              <TextField
                fullWidth margin="normal"
                label="验证码"
                value={code}
                onChange={e => setCode(e.target.value)}
                helperText="5分钟内有效"
              />
              <TextField
                fullWidth margin="normal"
                type="password"
                label="新密码"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                helperText="至少6位"
              />
              <TextField
                fullWidth margin="normal"
                type="password"
                label="确认新密码"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
              />
              <Button type="submit" fullWidth variant="contained" sx={{ mt: 2 }} disabled={loading}>
                {loading ? '提交中...' : '重置密码'}
              </Button>
            </Box>
          )}

          <Typography variant="body2" align="center" sx={{ mt: 2 }}>
            想起来了？
            <Link component={RouterLink} to="/login">
              返回登录
            </Link>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
