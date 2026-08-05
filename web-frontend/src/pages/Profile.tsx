import { useEffect, useState } from 'react';
import { Alert, Box, Button, Divider, Typography } from '@mui/material';
import { ListAlt as ListIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import client from '../api/client';
import { getApiErrorMessage } from '../api/errors';
import ProfilePersonalInfo from '../components/profile/ProfilePersonalInfo';
import ProfileEmailSettings, { type EmailPreferences } from '../components/profile/ProfileEmailSettings';
import ProfilePasswordForm from '../components/profile/ProfilePasswordForm';

const defaultPreferences: EmailPreferences = {
  claim_request: false,
  claim_result: false,
  announcement: false,
  message: false,
  system_message: true,
};

export default function Profile() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [realName, setRealName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [sendingCode, setSendingCode] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [emailPrefs, setEmailPrefs] = useState(defaultPreferences);

  useEffect(() => {
    if (!user) return;
    setRealName(user.realName || '');
    setEmail(user.email || '');
    setPhone(user.phone || '');
    setAvatarUrl(user.avatar || '');
    let active = true;
    client.get('/users/me/email-preferences')
      .then(response => {
        if (!active) return;
        const data = response.data.data || {};
        setEmailVerified(Boolean(data.emailVerified));
        setEmailPrefs({
          claim_request: Boolean(data.claim_request),
          claim_result: Boolean(data.claim_result),
          announcement: Boolean(data.announcement),
          message: Boolean(data.message),
          system_message: true,
        });
      })
      .catch(errorValue => { if (active) setError(getApiErrorMessage(errorValue, '加载邮件设置失败')); });
    return () => { active = false; };
  }, [user]);

  if (!user) {
    return <Box sx={{ textAlign: 'center', py: 6 }}>
      <Typography variant="h6" color="text.secondary">请先登录</Typography>
      <Button variant="contained" sx={{ mt: 2 }} onClick={() => navigate('/login')}>去登录</Button>
    </Box>;
  }

  const handleSave = async () => {
    setError('');
    setSuccess('');
    if (phone && !/^\+\d{1,4} \d{5,15}$/.test(phone)) {
      setError('手机号需为 5-15 位纯数字');
      return;
    }
    setLoading(true);
    try {
      const response = await client.put('/users/me', {
        realName, email: email || undefined, phone: phone || undefined, avatar: avatarUrl || undefined,
      });
      login(response.data.data);
      setSuccess('保存成功');
      setEditing(false);
    } catch (errorValue) {
      setError(getApiErrorMessage(errorValue, '保存失败'));
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setEditing(false);
    setError('');
    setRealName(user.realName || '');
    setEmail(user.email || '');
    setPhone(user.phone || '');
    setAvatarUrl(user.avatar || '');
  };

  const handleChangePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setPwError('');
    setPwSuccess('');
    if (!oldPassword || !newPassword || !confirmPassword) {
      setPwError('请填写所有密码字段');
      return;
    }
    if (newPassword.length < 6) {
      setPwError('新密码至少6位');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError('两次输入的新密码不一致');
      return;
    }
    setPwLoading(true);
    try {
      await client.put('/users/me/password', { oldPassword, newPassword });
      setPwSuccess('密码修改成功');
      setOldPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch (errorValue) {
      setPwError(getApiErrorMessage(errorValue, '修改失败'));
    } finally {
      setPwLoading(false);
    }
  };

  const handleSendCode = async () => {
    setError(''); setSendingCode(true);
    try {
      await client.post('/users/me/send-verify-code');
      setSuccess('验证码已发送到您的邮箱');
    } catch (errorValue) {
      setError(getApiErrorMessage(errorValue, '发送失败'));
    } finally { setSendingCode(false); }
  };

  const handleVerifyEmail = async () => {
    if (!verifyCode) { setError('请输入验证码'); return; }
    setVerifying(true);
    try {
      await client.post('/users/me/verify-email', { code: verifyCode });
      setEmailVerified(true); setVerifyCode(''); setSuccess('邮箱验证成功');
    } catch (errorValue) {
      setError(getApiErrorMessage(errorValue, '验证失败'));
    } finally { setVerifying(false); }
  };

  const handlePreferenceChange = async (key: keyof EmailPreferences, value: boolean) => {
    setEmailPrefs(previous => ({ ...previous, [key]: value }));
    try {
      await client.put('/users/me/email-preferences', { [key]: value });
    } catch (errorValue) {
      setEmailPrefs(previous => ({ ...previous, [key]: !value }));
      setError(getApiErrorMessage(errorValue, '更新失败'));
    }
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ pb: 1, mb: 3, borderBottom: 2,
        borderColor: 'primary.main', display: 'inline-block' }}>个人中心</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}
      <ProfilePersonalInfo user={user} editing={editing} loading={loading} realName={realName}
        email={email} phone={phone} avatarUrl={avatarUrl} onEdit={() => setEditing(true)}
        onCancel={handleCancel} onSave={handleSave} onRealNameChange={setRealName}
        onEmailChange={setEmail} onPhoneChange={setPhone} onAvatarChange={setAvatarUrl} />
      <Divider sx={{ my: 4 }} />
      <ProfileEmailSettings email={user.email || email} verified={emailVerified} preferences={emailPrefs}
        verifyCode={verifyCode} sendingCode={sendingCode} verifying={verifying}
        onVerifyCodeChange={setVerifyCode} onSendCode={handleSendCode} onVerify={handleVerifyEmail}
        onPreferenceChange={handlePreferenceChange} />
      <ProfilePasswordForm oldPassword={oldPassword} newPassword={newPassword}
        confirmPassword={confirmPassword} loading={pwLoading} error={pwError} success={pwSuccess}
        onOldPasswordChange={setOldPassword} onNewPasswordChange={setNewPassword}
        onConfirmPasswordChange={setConfirmPassword} onSubmit={handleChangePassword}
        onClearError={() => setPwError('')} onClearSuccess={() => setPwSuccess('')} />
      <Box sx={{ p: 3, maxWidth: 600 }}>
        <Typography variant="h6" gutterBottom>我的申请</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          查看您发出和收到的物品认领申请
        </Typography>
        <Button variant="contained" startIcon={<ListIcon />} onClick={() => navigate('/claims')}>
          查看申请记录
        </Button>
      </Box>
    </Box>
  );
}
