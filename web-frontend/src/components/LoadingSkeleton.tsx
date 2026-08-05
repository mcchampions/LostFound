import { Box, Skeleton } from '@mui/material';

export default function LoadingSkeleton() {
  return <Box sx={{ py: 3 }} aria-label="页面加载中">
    <Skeleton variant="text" width="35%" height={44} />
    <Skeleton variant="rounded" height={140} sx={{ mt: 2 }} />
    <Skeleton variant="text" width="80%" sx={{ mt: 2 }} />
    <Skeleton variant="text" width="65%" />
  </Box>;
}
