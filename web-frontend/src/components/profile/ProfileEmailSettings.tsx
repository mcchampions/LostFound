import { Box, Button, Checkbox, Chip, FormControlLabel, Paper, TextField, Typography, Alert } from '@mui/material';

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

const preferenceLabels: Array<[keyof EmailPreferences, string]> = [
  ['claim_request', '有人提交认领申请或失物线索'],
  ['claim_result', '自己提交的申请被通过或拒绝'],
  ['announcement', '系统发布新公告'],
  ['message', '对话有新的未读消息'],
];

export default function ProfileEmailSettings({
  email, verified, preferences, verifyCode, sendingCode, verifying,
  onVerifyCodeChange, onSendCode, onVerify, onPreferenceChange,
}: ProfileEmailSettingsProps) {
  return (
    <>
      <Paper sx={{ p: 3, maxWidth: 600, mb: 4 }}>
        <Typography variant="h6" gutterBottom>邮箱验证</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Typography variant="body2">当前邮箱：{email || '未设置'}</Typography>
          {verified ? <Chip label="已验证" color="success" size="small" /> : <Chip label="未验证" size="small" />}
        </Box>
        {email && !verified && (
          <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
            <TextField size="small" label="验证码" value={verifyCode}
              onChange={event => onVerifyCodeChange(event.target.value)} sx={{ width: 120 }} />
            <Button variant="outlined" size="small" onClick={onSendCode} disabled={sendingCode}>
              {sendingCode ? '发送中...' : '发送验证码'}
            </Button>
            <Button variant="contained" size="small" onClick={onVerify} disabled={verifying}>
              {verifying ? '验证中...' : '验证'}
            </Button>
          </Box>
        )}
      </Paper>
      <Paper sx={{ p: 3, maxWidth: 600, mb: 4 }}>
        <Typography variant="h6" gutterBottom>邮件提醒设置</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          选择您希望接收邮件提醒的内容（系统邮件不可关闭）
        </Typography>
        {!verified && <Alert severity="info" sx={{ mb: 2 }}>请先验证邮箱后才能开启邮件提醒</Alert>}
        {preferenceLabels.map(([key, label]) => (
          <FormControlLabel key={key}
            control={<Checkbox checked={preferences[key]} disabled={!verified}
              onChange={event => onPreferenceChange(key, event.target.checked)} />}
            label={label} />
        ))}
        <FormControlLabel control={<Checkbox checked disabled />} label="账号安全、邮箱验证等系统邮件" />
      </Paper>
    </>
  );
}
