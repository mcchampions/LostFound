import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Avatar, Box, Button, Chip, Grid, Paper, TextField, Typography
} from '@mui/material';
import { Edit as EditIcon } from '@mui/icons-material';
import { assetUrl } from '../../config';
import ImageCropDialog from '../ImageCropDialog';
import PhoneInput from '../PhoneInput';
import type { User } from '../../store/AuthContext';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const cropImageUrl = useMemo(
    () => (cropFile ? URL.createObjectURL(cropFile) : ''),
    [cropFile],
  );
  const roleLabels: Record<string, string> = {
    ADMIN: t('admin.roleAdmin'), STUDENT: t('admin.roleStudent'), TEACHER: t('admin.roleTeacher'), USER: t('admin.roleUser'),
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
                  <Typography variant="body2" color="text.secondary">{t('profile.email')}</Typography>
                  <Typography variant="body2" noWrap>{user.email || t('common.notSet')}</Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Box sx={{ py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="body2" color="text.secondary">{t('profile.phone')}</Typography>
                  <Typography variant="body2">{user.phone || t('common.notSet')}</Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Box sx={{ py: 1 }}>
                  <Typography variant="body2" color="text.secondary">{t('profile.role')}</Typography>
              <Typography variant="body2">{roleLabels[user.role] || user.role}</Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Box sx={{ py: 1 }}>
                  <Typography variant="body2" color="text.secondary">{t('profile.username')}</Typography>
                  <Typography variant="body2">@{user.username}</Typography>
                </Box>
              </Grid>
            </Grid>
            <Button variant="outlined" startIcon={<EditIcon />} onClick={onEdit} sx={{ mt: 3 }}>
              {t('profile.editProfile')}
            </Button>
          </>
        ) : (
          <Box sx={{ width: '100%' }}>
            <TextField fullWidth label={t('profile.realName')} value={realName}
              onChange={event => onRealNameChange(event.target.value)} margin="normal" />
            <TextField fullWidth label={t('profile.email')} value={email}
              onChange={event => onEmailChange(event.target.value)} margin="normal" />
            <Box sx={{ mt: 2, mb: 1 }}>
              <PhoneInput value={phone} onChange={onPhoneChange} size="small" />
            </Box>
            <Box sx={{ textAlign: 'center', mt: 1, mb: 2 }}>
              <Button variant="outlined" component="label" disabled={loading}>
                {t('profile.uploadAvatar')}
                <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleAvatarChange} />
              </Button>
              {avatarUrl && (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="caption" color="text.secondary">{t('profile.avatarPreview')}</Typography>
                  <Box component="img" src={assetUrl(avatarUrl)} alt={t('profile.avatarPreview')}
                    sx={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', mt: 0.5 }} />
                </Box>
              )}
            </Box>
            <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
              <Button variant="contained" onClick={onSave} disabled={loading}>
                {loading ? t('common.saving') : t('common.save')}
              </Button>
              <Button variant="outlined" onClick={onCancel} disabled={loading}>{t('common.cancel')}</Button>
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
