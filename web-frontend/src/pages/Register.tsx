import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Box, Card, CardContent, TextField, Button, Typography, Alert,
  FormControl, InputLabel, Select, MenuItem, Link
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { register as registerApi } from '../api/auth';
import PhoneInput from '../components/PhoneInput';
import { getApiErrorMessage } from '../api/errors';

export default function Register() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    username: '',
    password: '',
    realName: '',
    email: '',
    phone: '',
    role: 'STUDENT',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const handleChange = (field: string) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.username.trim() || !form.password.trim() || !form.realName.trim()) {
      setError(t('auth.requiredFields'));
      return;
    }
    if (form.password.length < 6) {
      setError(t('auth.passwordTooShort'));
      return;
    }
    if (form.phone && !/^\+\d{1,4} \d{5,15}$/.test(form.phone)) {
      setError(t('auth.phoneInvalid'));
      return;
    }

    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await registerApi({
        username: form.username,
        password: form.password,
        realName: form.realName,
        role: form.role,
        email: form.email || undefined,
        phone: form.phone || undefined,
      });
      setSuccess(t('auth.registerSuccess'));
      timerRef.current = setTimeout(() => navigate('/login'), 1500);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, t('auth.registerFailed')));
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
      <Card sx={{ width: 460, maxWidth: '90vw', p: 2 }}>
        <CardContent>
          <Typography variant="h5" align="center" gutterBottom>
            {t('auth.registerTitle')}
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}
          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {success}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              fullWidth margin="normal"
              label={t('auth.username')} required
              value={form.username}
              onChange={handleChange('username')}
            />
            <TextField
              fullWidth margin="normal"
              type="password"
              label={t('auth.password')} required
              value={form.password}
              onChange={handleChange('password')}
              helperText={t('auth.passwordMinHint')}
            />
            <TextField
              fullWidth margin="normal"
              label={t('auth.realName')} required
              value={form.realName}
              onChange={handleChange('realName')}
            />
            <FormControl fullWidth margin="normal">
              <InputLabel>{t('auth.role')}</InputLabel>
              <Select
                value={form.role}
                label={t('auth.role')}
                onChange={(e) => setForm(prev => ({ ...prev, role: e.target.value }))}
              >
                <MenuItem value="STUDENT">{t('auth.student')}</MenuItem>
                <MenuItem value="TEACHER">{t('auth.teacher')}</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth margin="normal"
              label={t('auth.email')}
              value={form.email}
              onChange={handleChange('email')}
              type="email"
            />
            <Box sx={{ mt: 2 }}>
              <PhoneInput
                label={t('auth.phone')}
                value={form.phone}
                onChange={phone => setForm(prev => ({ ...prev, phone }))}
              />
            </Box>
            <Button
              type="submit"
              fullWidth variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading}
            >
              {loading ? t('auth.registerLoading') : t('auth.registerTitle')}
            </Button>
          </Box>

          <Typography variant="body2" align="center">
            {t('auth.hasAccount')}
            <Link component={RouterLink} to="/login">
              {t('auth.goLogin')}
            </Link>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
