import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Paper, Avatar, Chip, TextField,
  Alert, Divider, Grid, FormControlLabel, Checkbox
} from '@mui/material';
import { Edit as EditIcon, ListAlt as ListIcon } from '@mui/icons-material';
import { useAuth } from '../store/AuthContext';
import client from '../api/client';
import { assetUrl } from '../config';
import ImageCropDialog from '../components/ImageCropDialog';
import PhoneInput from '../components/PhoneInput';

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
  const [emailVerified, setEmailVerified] = useState(false);
  const [emailPrefs, setEmailPrefs] = useState({
    claim_request: false,
    claim_result: false,
    announcement: false,
    message: false,
    system_message: true,
  });

  useEffect(() => {
    if (user) {
      setRealName(user.realName || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
      setNewAvatarUrl(user.avatar || '');
      client.get('/users/me/email-preferences').then(r => {
        const d = r.data.data || {};
        setEmailVerified(d.emailVerified || false);
        setEmailPrefs({
          claim_request: d.claim_request || false,
          claim_result: d.claim_result || false,
          announcement: d.announcement || false,
          message: d.message || false,
          system_message: true,
        });
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
      if (phone && !/^\+\d{1,4} \d{5,15}$/.test(phone)) {
        setError('手机号需为 5-15 位纯数字');
        setLoading(false);
        return;
      }
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

  const handlePrefChange = async (key: string, val: boolean) => {
    setEmailPrefs(prev => ({ ...prev, [key]: val }));
    try {
      await client.put('/users/me/email-preferences', { [key]: val });
    } catch (err: any) {
      setEmailPrefs(prev => ({ ...prev, [key]: !val }));
      setError(err.response?.data?.message || '更新失败');
    }
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
              <Box sx={{ mt: 2, mb: 1 }}>
                <PhoneInput value={phone} onChange={setPhone} size="small" />
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
        <Typography variant="h6" gutterBottom>邮件提醒设置</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          选择您希望接收邮件提醒的内容（系统邮件不可关闭）
        </Typography>
        {!emailVerified && (
          <Alert severity="info" sx={{ mb: 2 }}>
            请先验证邮箱后才能开启邮件提醒
          </Alert>
        )}
        <FormControlLabel
          control={<Checkbox checked={emailPrefs.claim_request} disabled={!emailVerified}
            onChange={e => handlePrefChange('claim_request', e.target.checked)} />}
          label="有人提交认领申请或失物线索"
        />
        <FormControlLabel
          control={<Checkbox checked={emailPrefs.claim_result} disabled={!emailVerified}
            onChange={e => handlePrefChange('claim_result', e.target.checked)} />}
          label="自己提交的申请被通过或拒绝"
        />
        <FormControlLabel
          control={<Checkbox checked={emailPrefs.announcement} disabled={!emailVerified}
            onChange={e => handlePrefChange('announcement', e.target.checked)} />}
          label="系统发布新公告"
        />
        <FormControlLabel
          control={<Checkbox checked={emailPrefs.message} disabled={!emailVerified}
            onChange={e => handlePrefChange('message', e.target.checked)} />}
          label="对话有新的未读消息"
        />
        <FormControlLabel
          control={<Checkbox checked disabled />}
          label="账号安全、邮箱验证等系统邮件"
        />
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
