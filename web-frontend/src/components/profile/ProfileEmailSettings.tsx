import { Box, Button, Checkbox, Chip, FormControlLabel, Paper, TextField, Typography, Alert } from '@mui/material';
import { useTranslation } from 'react-i18next';

export interface EmailPreferences {
  claim_request: boolean;
  claim_result: boolean;
  announcement: boolean;
  message: boolean;
  system_message: boolean;
}

interface ProfileEmailSettingsProps {
  email: string;
  verified: boolean;
  preferences: EmailPreferences;
  verifyCode: string;
  sendingCode: boolean;
  verifying: boolean;
  onVerifyCodeChange: (value: string) => void;
  onSendCode: () => void;
  onVerify: () => void;
  onPreferenceChange: (key: keyof EmailPreferences, value: boolean) => void;
}

export default function ProfileEmailSettings({
  email, verified, preferences, verifyCode, sendingCode, verifying,
  onVerifyCodeChange, onSendCode, onVerify, onPreferenceChange,
}: ProfileEmailSettingsProps) {
  const { t } = useTranslation();
  const preferenceLabels: Array<[keyof EmailPreferences, string]> = [
    ['claim_request', t('profile.claimRequestLabel')],
    ['claim_result', t('profile.claimResultLabel')],
    ['announcement', t('profile.announcementLabel')],
    ['message', t('profile.messageLabel')],
  ];
  return (
    <>
      <Paper sx={{ p: 3, maxWidth: 600, mb: 4 }}>
        <Typography variant="h6" gutterBottom>{t('profile.emailVerification')}</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Typography variant="body2">{t('profile.currentEmail', { email: email || t('common.notSet') })}</Typography>
          {verified ? <Chip label={t('profile.verified')} color="success" size="small" /> : <Chip label={t('profile.unverified')} size="small" />}
        </Box>
        {email && !verified && (
          <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
            <TextField size="small" label={t('profile.verifyCode')} value={verifyCode}
              onChange={event => onVerifyCodeChange(event.target.value)} sx={{ width: 120 }} />
            <Button variant="outlined" size="small" onClick={onSendCode} disabled={sendingCode}>
              {sendingCode ? t('profile.sendingCode') : t('profile.sendCode')}
            </Button>
            <Button variant="contained" size="small" onClick={onVerify} disabled={verifying}>
              {verifying ? t('profile.verifying') : t('profile.verify')}
            </Button>
          </Box>
        )}
      </Paper>
      <Paper sx={{ p: 3, maxWidth: 600, mb: 4 }}>
        <Typography variant="h6" gutterBottom>{t('profile.emailSettings')}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t('profile.emailSettingsDesc')}
        </Typography>
        {!verified && <Alert severity="info" sx={{ mb: 2 }}>{t('profile.verifyFirst')}</Alert>}
        {preferenceLabels.map(([key, label]) => (
          <FormControlLabel key={key}
            control={<Checkbox checked={preferences[key]} disabled={!verified}
              onChange={event => onPreferenceChange(key, event.target.checked)} />}
            label={label} />
        ))}
        <FormControlLabel control={<Checkbox checked disabled />} label={t('profile.systemLabel')} />
      </Paper>
    </>
  );
}
