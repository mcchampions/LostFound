import { Box, Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { SentimentDissatisfied as SadIcon } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

export default function NotFound() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 2 }}>
      <SadIcon sx={{ fontSize: 80, color: 'text.disabled' }} />
      <Typography variant="h2" color="text.disabled">404</Typography>
      <Typography variant="h6" color="text.secondary">{t('notFound.title')}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{t('notFound.body')}</Typography>
      <Button variant="contained" onClick={() => navigate('/')}>{t('notFound.backHome')}</Button>
    </Box>
  );
}
