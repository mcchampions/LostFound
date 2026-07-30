import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, TextField, Select, MenuItem, FormControl,
  InputLabel, Grid, Card, CardMedia, CardContent, CardActionArea, Chip,
  Pagination, CircularProgress, Alert, InputAdornment
} from '@mui/material';
import { Search as SearchIcon, Add as AddIcon, ImageOutlined as ImageIcon } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../store/AuthContext';
import { assetUrl } from '../config';
import { getLostItems } from '../api/lostItems';
import type { LostItemVO } from '../api/lostItems';
import { getCategories } from '../api/categories';
import type { Category } from '../api/categories';

export default function LostItemList() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [items, setItems] = useState<LostItemVO[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);

  const [keyword, setKeyword] = useState('');
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [status, setStatus] = useState<string>('');

  const pageSize = 12;

  useEffect(() => {
    getCategories()
      .then(setCategories)
      .catch(() => {});
  }, []);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params: any = { page, size: pageSize };
      if (keyword.trim()) params.keyword = keyword.trim();
      if (categoryId !== '') params.categoryId = categoryId;
      if (status) params.status = status;

      const data = await getLostItems(params);
      setItems(data.records || []);
      setTotal(data.total || 0);
      setTotalPages(Math.ceil((data.total || 0) / pageSize) || 1);
    } catch {
      setError('加载失物信息失败');
    } finally {
      setLoading(false);
    }
  }, [page, keyword, categoryId, status]);

  useEffect(() => {
    fetchItems();
  }, [page]);

  const handleSearch = () => {
    if (page === 1) {
      fetchItems();
    } else {
      setPage(1);
    }
  };

  const handlePageChange = (_: any, value: number) => {
    setPage(value);
    window.scrollTo(0, 0);
  };

  const getStatusChip = (s: string) => {
    if (s === 'LOST') return <Chip label="未找到" size="small" color="error" />;
    if (s === 'FOUND') return <Chip label="已找到" size="small" color="success" />;
    return <Chip label={s} size="small" />;
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ pb: 1, mb: 3, borderBottom: 2, borderColor: 'primary.main', display: 'inline-block' }}>失物信息</Typography>

      {/* Toolbar */}
      <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField
          size="small"
          placeholder="搜索关键字"
          value={keyword}
          onChange={e => setKeyword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start"><SearchIcon /></InputAdornment>
              ),
            },
          }}
          sx={{ minWidth: 200 }}
        />
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>分类</InputLabel>
          <Select
            value={categoryId}
            label="分类"
            onChange={e => setCategoryId(e.target.value as number | '')}
          >
            <MenuItem value="">{t('common.all')}</MenuItem>
            {categories.map(cat => (
              <MenuItem key={cat.id} value={cat.id}>{cat.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 100 }}>
          <InputLabel>状态</InputLabel>
          <Select
            value={status}
            label="状态"
            onChange={e => setStatus(e.target.value)}
          >
            <MenuItem value="">{t('common.all')}</MenuItem>
            <MenuItem value="LOST">未找到</MenuItem>
            <MenuItem value="FOUND">已找到</MenuItem>
          </Select>
        </FormControl>
        <Button variant="contained" size="small" onClick={handleSearch}>
          {t('common.search')}
        </Button>
        {user && (
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            onClick={() => navigate('/lost-items/create')}
            sx={{ ml: 'auto' }}
          >
            发布失物
          </Button>
        )}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : items.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <Typography variant="h6" color="text.secondary">暂无失物信息</Typography>
          {user && (
            <Button variant="contained" sx={{ mt: 2 }} onClick={() => navigate('/lost-items/create')}>
              发布第一条失物
            </Button>
          )}
        </Box>
      ) : (
        <>
          <Grid container spacing={2}>
            {items.map(item => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={item.id}>
                <Card sx={{ height: '100%' }}>
                  <CardActionArea
                    onClick={() => navigate(`/lost-items/${item.id}`)}
                    sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}
                  >
                    {item.coverImage ? (
                      <CardMedia
                        component="img"
                        image={assetUrl(item.coverImage)}
                        sx={{ aspectRatio: '16 / 9', width: '100%', objectFit: 'cover', bgcolor: 'grey.200', display: 'block' }}
                      />
                    ) : (
                      <Box sx={{
                        aspectRatio: '16 / 9', width: '100%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        bgcolor: 'grey.100'
                      }}>
                        <ImageIcon sx={{ fontSize: 48, color: 'grey.400' }} />
                      </Box>
                    )}
                    <CardContent sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 'bold', flex: 1 }} noWrap>
                          {item.title}
                        </Typography>
                        {getStatusChip(item.status)}
                      </Box>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1 }}>
                        <Chip label={item.categoryName} size="small" variant="outlined" />
                      </Box>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        地点：{item.location}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        时间：{new Date(item.lostTime).toLocaleString('zh-CN')}{item.lostTimeEnd && ` ~ ${new Date(item.lostTimeEnd).toLocaleString('zh-CN')}`}
                      </Typography>
                      <Typography variant="caption" color="text.disabled" sx={{ mt: 1, display: 'block' }}>
                        发布者：{item.userName}
                      </Typography>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
          </Grid>

          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={handlePageChange}
                color="primary"
              />
            </Box>
          )}

          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>
            共 {total} 条记录
          </Typography>
        </>
      )}
    </Box>
  );
}
