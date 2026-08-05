import { Alert, Box, Button, Paper, TextField, Typography } from '@mui/material';

interface ProfilePasswordFormProps {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
  loading: boolean;
  error: string;
  success: string;
  onOldPasswordChange: (value: string) => void;
  onNewPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onSubmit: (event: React.FormEvent) => void;
  onClearError: () => void;
  onClearSuccess: () => void;
}

export default function ProfilePasswordForm({
  oldPassword, newPassword, confirmPassword, loading, error, success,
  onOldPasswordChange, onNewPasswordChange, onConfirmPasswordChange,
  onSubmit, onClearError, onClearSuccess,
}: ProfilePasswordFormProps) {
  return (
    <Paper sx={{ p: 3, maxWidth: 600, mb: 4 }}>
      <Typography variant="h6" gutterBottom>修改密码</Typography>
      <Box component="form" onSubmit={onSubmit} sx={{ mt: 2 }}>
        <TextField fullWidth type="password" label="原密码" value={oldPassword}
          onChange={event => onOldPasswordChange(event.target.value)} margin="normal" />
        <TextField fullWidth type="password" label="新密码" value={newPassword}
          onChange={event => onNewPasswordChange(event.target.value)} margin="normal" />
        <TextField fullWidth type="password" label="确认新密码" value={confirmPassword}
          onChange={event => onConfirmPasswordChange(event.target.value)} margin="normal" />
        <Button type="submit" variant="contained" disabled={loading} sx={{ mt: 2 }}>
          {loading ? '修改中...' : '修改密码'}
        </Button>
        {error && <Alert severity="error" sx={{ mt: 2 }} onClose={onClearError}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mt: 2 }} onClose={onClearSuccess}>{success}</Alert>}
      </Box>
    </Paper>
  );
}
