import { Box, Skeleton } from '@mui/material';
import { useTranslation } from 'react-i18next';

export default function LoadingSkeleton() {
  const { t } = useTranslation();
  return <Box sx={{ py: 3 }} aria-label={t('common.loading')}>
    <Skeleton variant="text" width="35%" height={44} />
    <Skeleton variant="rounded" height={140} sx={{ mt: 2 }} />
    <Skeleton variant="text" width="80%" sx={{ mt: 2 }} />
    <Skeleton variant="text" width="65%" />
  </Box>;
}
