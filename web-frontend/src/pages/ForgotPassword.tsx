import { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Box, Card, CardContent, TextField, Button, Typography, Alert, Link
} from '@mui/material';
import { LockReset as LockResetIcon } from '@mui/icons-material';
import { forgotPassword, resetPassword } from '../api/auth';
import { getApiErrorMessage } from '../api/errors';
import { useTranslation } from 'react-i18next';

export default function ForgotPassword() {
  const { t } = useTranslation();
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
      setError(t('auth.emailRequired'));
      return;
    }
    setError('');
    setNotice('');
    setLoading(true);
    try {
      await forgotPassword(email.trim());
      setNotice(t('auth.codeSent'));
      setStep(2);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, t('auth.sendFailed')));
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      setError(t('auth.enterCode'));
      return;
    }
    if (newPassword.length < 6) {
      setError(t('auth.newPasswordTooShort'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t('auth.passwordMismatch'));
      return;
    }
    setError('');
    setLoading(true);
    try {
      await resetPassword({ email: email.trim(), code: code.trim(), newPassword });
      setNotice(t('auth.passwordResetSuccess'));
      setTimeout(() => navigate('/login'), 1200);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, t('auth.resetFailed')));
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
            <LockResetIcon /> {t('auth.resetTitle')}
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
                label={t('auth.registeredEmail')}
                value={email}
                onChange={e => setEmail(e.target.value)}
                helperText={t('auth.emailHelper')}
              />
              <Button type="submit" fullWidth variant="contained" sx={{ mt: 2 }} disabled={loading}>
                {loading ? t('auth.sending') : t('auth.sendCode')}
              </Button>
            </Box>
          ) : (
            <Box component="form" onSubmit={handleReset}>
              <TextField
                fullWidth margin="normal"
                label={t('auth.email')}
                value={email}
                disabled
              />
              <TextField
                fullWidth margin="normal"
                label={t('auth.code')}
                value={code}
                onChange={e => setCode(e.target.value)}
                helperText={t('auth.codeHelper')}
              />
              <TextField
                fullWidth margin="normal"
                type="password"
                label={t('auth.newPassword')}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                helperText={t('auth.newPasswordHelper')}
              />
              <TextField
                fullWidth margin="normal"
                type="password"
                label={t('auth.confirmNewPassword')}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
              />
              <Button type="submit" fullWidth variant="contained" sx={{ mt: 2 }} disabled={loading}>
                {loading ? t('auth.resetting') : t('auth.resetPassword')}
              </Button>
            </Box>
          )}

          <Typography variant="body2" align="center" sx={{ mt: 2 }}>
            {t('auth.remembered')}
            <Link component={RouterLink} to="/login">
              {t('auth.backToLogin')}
            </Link>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
