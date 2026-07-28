import { Box, Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { SentimentDissatisfied as SadIcon } from '@mui/icons-material';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 2 }}>
      <SadIcon sx={{ fontSize: 80, color: 'text.disabled' }} />
      <Typography variant="h2" color="text.disabled">404</Typography>
      <Typography variant="h6" color="text.secondary">页面不存在</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>您访问的页面可能已被移除或地址不正确</Typography>
      <Button variant="contained" onClick={() => navigate('/')}>返回首页</Button>
    </Box>
  );
}
