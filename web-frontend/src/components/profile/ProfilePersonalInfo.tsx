import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Avatar, Box, Button, Chip, Grid, Paper, TextField, Typography
} from '@mui/material';
import { Edit as EditIcon } from '@mui/icons-material';
import { assetUrl } from '../../config';
import ImageCropDialog from '../ImageCropDialog';
import PhoneInput from '../PhoneInput';
import type { User } from '../../store/AuthContext';

interface ProfilePersonalInfoProps {
  user: User;
  editing: boolean;
  loading: boolean;
  realName: string;
  email: string;
  phone: string;
  avatarUrl: string;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
  onRealNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  onAvatarChange: (value: string) => void;
}

export default function ProfilePersonalInfo({
  user, editing, loading, realName, email, phone, avatarUrl,
  onEdit, onCancel, onSave, onRealNameChange, onEmailChange,
  onPhoneChange, onAvatarChange,
}: ProfilePersonalInfoProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const cropImageUrl = useMemo(
    () => (cropFile ? URL.createObjectURL(cropFile) : ''),
    [cropFile],
  );
  const roleLabels: Record<string, string> = {
    ADMIN: '管理员', STUDENT: '学生', TEACHER: '教师', USER: '普通用户',
  };

  useEffect(() => () => {
    if (cropImageUrl) URL.revokeObjectURL(cropImageUrl);
  }, [cropImageUrl]);

  const closeCrop = () => {
    setCropOpen(false);
    setCropFile(null);
  };

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setCropFile(file);
    setCropOpen(true);
    event.target.value = '';
  };

  return (
    <Paper sx={{ p: 4, maxWidth: 600 }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Avatar
          src={assetUrl(avatarUrl || user.avatar || '') || undefined}
          sx={{ width: 80, height: 80, fontSize: 32, bgcolor: 'primary.main', mb: 2 }}
        >
          {user.realName?.charAt(0) || user.username?.charAt(0) || 'U'}
        </Avatar>

        {!editing ? (
          <>
            <Typography variant="h6">{user.realName}</Typography>
            <Typography variant="body2" color="text.secondary">@{user.username}</Typography>
            <Box sx={{ mt: 1 }}>
              <Chip label={roleLabels[user.role] || user.role} size="small" />
            </Box>
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
              <Typography variant="body2">{roleLabels[user.role] || user.role}</Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Box sx={{ py: 1 }}>
                  <Typography variant="body2" color="text.secondary">用户名</Typography>
                  <Typography variant="body2">@{user.username}</Typography>
                </Box>
              </Grid>
            </Grid>
            <Button variant="outlined" startIcon={<EditIcon />} onClick={onEdit} sx={{ mt: 3 }}>
              编辑
            </Button>
          </>
        ) : (
          <Box sx={{ width: '100%' }}>
            <TextField fullWidth label="真实姓名" value={realName}
              onChange={event => onRealNameChange(event.target.value)} margin="normal" />
            <TextField fullWidth label="邮箱" value={email}
              onChange={event => onEmailChange(event.target.value)} margin="normal" />
            <Box sx={{ mt: 2, mb: 1 }}>
              <PhoneInput value={phone} onChange={onPhoneChange} size="small" />
            </Box>
            <Box sx={{ textAlign: 'center', mt: 1, mb: 2 }}>
              <Button variant="outlined" component="label" disabled={loading}>
                上传头像
                <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleAvatarChange} />
              </Button>
              {avatarUrl && (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="caption" color="text.secondary">头像预览</Typography>
                  <Box component="img" src={assetUrl(avatarUrl)} alt="头像预览"
                    sx={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', mt: 0.5 }} />
                </Box>
              )}
            </Box>
            <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
              <Button variant="contained" onClick={onSave} disabled={loading}>
                {loading ? '保存中...' : '保存'}
              </Button>
              <Button variant="outlined" onClick={onCancel} disabled={loading}>取消</Button>
            </Box>
          </Box>
        )}
      </Box>
      {cropFile && (
        <ImageCropDialog open={cropOpen} imageUrl={cropImageUrl} circular aspect={1}
          onCropped={url => { onAvatarChange(url); closeCrop(); }} onClose={closeCrop} />
      )}
    </Paper>
  );
}
