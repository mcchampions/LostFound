import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Paper, Avatar, Chip, TextField,
  Alert, Divider, Grid, MenuItem, Select, FormControl, Switch, FormControlLabel
} from '@mui/material';
import { Edit as EditIcon, ListAlt as ListIcon } from '@mui/icons-material';
import { useAuth } from '../store/AuthContext';
import client from '../api/client';
import { assetUrl } from '../config';
import ImageCropDialog from '../components/ImageCropDialog';

export default function Profile() {
  const { user, login } = useAuth();
  const navigate = useNavigate();

  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [realName, setRealName] = useState(user?.realName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [newAvatarUrl, setNewAvatarUrl] = useState(user?.avatar || '');
  const [cropOpen, setCropOpen] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const cropImageUrl = useMemo(() => (cropFile ? URL.createObjectURL(cropFile) : ''), [cropFile]);
  useEffect(() => () => { if (cropImageUrl) URL.revokeObjectURL(cropImageUrl); }, [cropImageUrl]);
  const [countryCode, setCountryCode] = useState('+86');
  const [phoneNumber, setPhoneNumber] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');

  const [verifyCode, setVerifyCode] = useState('');
  const [sendingCode, setSendingCode] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [notifyEmail, setNotifyEmail] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);

  useEffect(() => {
    if (user) {
      setRealName(user.realName || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
      setNewAvatarUrl(user.avatar || '');
      client.get('/users/me/preferences').then(r => {
        setNotifyEmail(r.data.data?.notifyEmail || false);
        setEmailVerified(r.data.data?.emailVerified || false);
      }).catch(() => {});
    }
  }, [user]);

  if (!user) {
    return (
      <Box sx={{ textAlign: 'center', py: 6 }}>
        <Typography variant="h6" color="text.secondary">请先登录</Typography>
        <Button variant="contained" sx={{ mt: 2 }} onClick={() => navigate('/login')}>
          去登录
        </Button>
      </Box>
    );
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCropFile(file);
    setCropOpen(true);
    e.target.value = '';
  };

  const handleCropConfirm = (url: string) => {
    setCropOpen(false);
    setCropFile(null);
    setNewAvatarUrl(url);
  };

  const handleSave = async () => {
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const res = await client.put('/users/me', {
        realName,
        email: email || undefined,
        phone: phone || undefined,
        avatar: newAvatarUrl || undefined,
      });
      const updatedUser = res.data.data;
      const token = localStorage.getItem('token') || '';
      login(token, updatedUser);
      setSuccess('保存成功');
      setEditing(false);
    } catch (err: any) {
      setError(err.response?.data?.message || '保存失败');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
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
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPwError(err.response?.data?.message || '修改失败');
    } finally {
      setPwLoading(false);
    }
  };

  const handleCancel = () => {
    setEditing(false);
    setError('');
    if (user) {
      setRealName(user.realName || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
      setNewAvatarUrl(user.avatar || '');
    }
  };

  const handleSendCode = async () => {
    setError('');
    setSendingCode(true);
    try { await client.post('/users/me/send-verify-code'); setSuccess('验证码已发送到您的邮箱'); }
    catch (err: any) { setError(err.response?.data?.message || '发送失败'); }
    finally { setSendingCode(false); }
  };

  const handleVerifyEmail = async () => {
    if (!verifyCode) { setError('请输入验证码'); return; }
    setVerifying(true);
    try { await client.post('/users/me/verify-email', { code: verifyCode }); setEmailVerified(true); setVerifyCode(''); setSuccess('邮箱验证成功'); }
    catch (err: any) { setError(err.response?.data?.message || '验证失败'); }
    finally { setVerifying(false); }
  };

  const handleNotifyToggle = async (val: boolean) => {
    setNotifyEmail(val);
    try { await client.put('/users/me/preferences', { notifyEmail: val }); }
    catch { setNotifyEmail(!val); }
  };

  const getRoleChip = (role: string) => {
    if (role === 'ADMIN') return <Chip label="管理员" color="primary" size="small" />;
    if (role === 'USER') return <Chip label="普通用户" color="default" size="small" />;
    return <Chip label={role} size="small" />;
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ pb: 1, mb: 3, borderBottom: 2, borderColor: 'primary.main', display: 'inline-block' }}>个人中心</Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      <Paper sx={{ p: 4, maxWidth: 600 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
          <Avatar
            src={assetUrl(newAvatarUrl || user?.avatar || '') || undefined}
            sx={{
              width: 80,
              height: 80,
              fontSize: 32,
              bgcolor: 'primary.main',
              mb: 2,
            }}
          >
            {user.realName?.charAt(0) || user.username?.charAt(0) || 'U'}
          </Avatar>

          {!editing ? (
            <>
              <Typography variant="h6">{user.realName}</Typography>
              <Typography variant="body2" color="text.secondary">@{user.username}</Typography>
              <Box sx={{ mt: 1 }}>{getRoleChip(user.role)}</Box>

              <Grid container spacing={2} sx={{ mt: 3, width: '100%' }}>
                <Grid size={{ xs: 6 }}>
                  <Box sx={{ py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="body2" color="text.secondary">邮箱</Typography>
                    <Typography variant="body2" noWrap>{user.email || '未设置'}</Typography>
                  </Box>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Box sx={{ py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="body2" color="text.secondary">手机</Typography>
                    <Typography variant="body2">{user.phone || '未设置'}</Typography>
                  </Box>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Box sx={{ py: 1 }}>
                    <Typography variant="body2" color="text.secondary">角色</Typography>
                    <Typography variant="body2">{user.role === 'ADMIN' ? '管理员' : '普通用户'}</Typography>
                  </Box>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Box sx={{ py: 1 }}>
                    <Typography variant="body2" color="text.secondary">用户名</Typography>
                    <Typography variant="body2">@{user.username}</Typography>
                  </Box>
                </Grid>
              </Grid>

              <Button
                variant="outlined"
                startIcon={<EditIcon />}
                onClick={() => setEditing(true)}
                sx={{ mt: 3 }}
              >
                编辑
              </Button>
            </>
          ) : (
            <Box sx={{ width: '100%' }}>
              <TextField
                fullWidth
                label="真实姓名"
                value={realName}
                onChange={e => setRealName(e.target.value)}
                margin="normal"
              />
              <TextField
                fullWidth
                label="邮箱"
                value={email}
                onChange={e => setEmail(e.target.value)}
                margin="normal"
              />
              <Box sx={{ display: 'flex', gap: 1, mt: 2, mb: 1 }}>
                <FormControl size="small" sx={{ minWidth: 100 }}>
                  <Select value={countryCode} onChange={e => setCountryCode(e.target.value)}>
                    <MenuItem value="+86">+86</MenuItem>
                    <MenuItem value="+852">+852</MenuItem>
                    <MenuItem value="+853">+853</MenuItem>
                    <MenuItem value="+886">+886</MenuItem>
                    <MenuItem value="+1">+1</MenuItem>
                    <MenuItem value="+81">+81</MenuItem>
                    <MenuItem value="+82">+82</MenuItem>
                    <MenuItem value="+44">+44</MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  fullWidth
                  label="手机号"
                  value={phoneNumber}
                  onChange={e => {
                    const v = e.target.value.replace(/\D/g, '');
                    setPhoneNumber(v);
                    setPhone(countryCode + ' ' + v);
                  }}
                />
              </Box>
              <Box sx={{ textAlign: 'center', mt: 1, mb: 2 }}>
                <Button variant="outlined" component="label" disabled={loading}>
                  上传头像
                  <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleAvatarChange} />
                </Button>
                {newAvatarUrl && (
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="caption" color="text.secondary">头像预览</Typography>
                    <Box
                      component="img"
                      src={newAvatarUrl}
                      alt="头像预览"
                      sx={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', mt: 0.5 }}
                    />
                  </Box>
                )}
              </Box>
              <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
                <Button
                  variant="contained"
                  onClick={handleSave}
                  disabled={loading}
                >
                  {loading ? '保存中...' : '保存'}
                </Button>
                <Button variant="outlined" onClick={handleCancel} disabled={loading}>
                  取消
                </Button>
              </Box>
            </Box>
          )}
        </Box>
      </Paper>

      <Divider sx={{ my: 4 }} />

      <Paper sx={{ p: 3, maxWidth: 600, mb: 4 }}>
        <Typography variant="h6" gutterBottom>邮箱验证</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Typography variant="body2">当前邮箱：{user.email || '未设置'}</Typography>
          {emailVerified ? <Chip label="已验证" color="success" size="small" /> : <Chip label="未验证" size="small" />}
        </Box>
        {user.email && !emailVerified && (
          <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
            <TextField size="small" label="验证码" value={verifyCode}
              onChange={e => setVerifyCode(e.target.value)} sx={{ width: 120 }} />
            <Button variant="outlined" size="small" onClick={handleSendCode} disabled={sendingCode}>
              {sendingCode ? '发送中...' : '发送验证码'}
            </Button>
            <Button variant="contained" size="small" onClick={handleVerifyEmail} disabled={verifying}>
              {verifying ? '验证中...' : '验证'}
            </Button>
          </Box>
        )}
      </Paper>

      <Paper sx={{ p: 3, maxWidth: 600, mb: 4 }}>
        <Typography variant="h6" gutterBottom>通知设置</Typography>
        <FormControlLabel
          control={<Switch checked={notifyEmail} onChange={e => handleNotifyToggle(e.target.checked)} />}
          label="接收邮件通知（认领进度、系统公告等）"
        />
        {!emailVerified && <Typography variant="caption" color="text.secondary">需先验证邮箱才能接收邮件通知</Typography>}
      </Paper>

      <Paper sx={{ p: 3, maxWidth: 600, mb: 4 }}>
        <Typography variant="h6" gutterBottom>修改密码</Typography>
        <Box component="form" onSubmit={handleChangePassword} sx={{ mt: 2 }}>
          <TextField
            fullWidth
            type="password"
            label="原密码"
            value={oldPassword}
            onChange={e => setOldPassword(e.target.value)}
            margin="normal"
          />
          <TextField
            fullWidth
            type="password"
            label="新密码"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            margin="normal"
          />
          <TextField
            fullWidth
            type="password"
            label="确认新密码"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            margin="normal"
          />
          <Button
            type="submit"
            variant="contained"
            disabled={pwLoading}
            sx={{ mt: 2 }}
          >
            {pwLoading ? '修改中...' : '修改密码'}
          </Button>
          {pwError && <Alert severity="error" sx={{ mt: 2 }} onClose={() => setPwError('')}>{pwError}</Alert>}
          {pwSuccess && <Alert severity="success" sx={{ mt: 2 }} onClose={() => setPwSuccess('')}>{pwSuccess}</Alert>}
        </Box>
      </Paper>

      <Paper sx={{ p: 3, maxWidth: 600 }}>
        <Typography variant="h6" gutterBottom>我的申请</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          查看您发出和收到的物品认领申请
        </Typography>
        <Button
          variant="contained"
          startIcon={<ListIcon />}
          onClick={() => navigate('/claims')}
        >
          查看申请记录
        </Button>
      </Paper>

      {cropFile && (
        <ImageCropDialog
          open={cropOpen}
          imageUrl={cropImageUrl}
          circular
          aspect={1}
          onCropped={handleCropConfirm}
          onClose={() => { setCropOpen(false); setCropFile(null); }}
        />
      )}
    </Box>
  );
}
