import { useState, useEffect, useCallback, useRef } from 'react';
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
import { getCategories } from '../api/categories';
import type { Category } from '../api/categories';
import type { PageResult } from '../types';
import { getApiErrorMessage } from '../api/errors';

export interface ItemListConfig<T> {
  type: 'lost' | 'found';
  title: string;
  createPath: string;
  detailPath: string;
  fetchItems: (params: { page: number; size: number; keyword?: string; categoryId?: number; status?: string }) => Promise<PageResult<T>>;
  getStatusChip: (status: string) => React.ReactNode;
  getTimeLabel: (item: T) => string;
  getTimeValue: (item: T) => string;
  getTimeEndValue?: (item: T) => string | undefined;
  statusOptions: Array<{ value: string; label: string }>;
  emptyText: string;
  emptyActionText: string;
  createButtonText: string;
}

export interface ItemListItem {
  id: number;
  title: string;
  categoryName: string;
  location: string;
  coverImage?: string;
  status: string;
  userName: string;
}

export default function ItemList<T extends ItemListItem>({ config }: { config: ItemListConfig<T> }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [items, setItems] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);

  const [keyword, setKeyword] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [status, setStatus] = useState<string>('');
  const requestIdRef = useRef(0);

  const pageSize = 12;

  useEffect(() => {
    getCategories()
      .then(setCategories)
      .catch(errorValue => setError(getApiErrorMessage(errorValue, '加载分类失败')));
  }, []);

  const fetchItems = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError('');
    try {
      const params: { page: number; size: number; keyword?: string; categoryId?: number; status?: string } = { page, size: pageSize };
      if (searchKeyword.trim()) params.keyword = searchKeyword.trim();
      if (categoryId !== '') params.categoryId = categoryId;
      if (status) params.status = status;

      const data = await config.fetchItems(params);
      if (requestId !== requestIdRef.current) return;
      setItems(data.records || []);
      setTotal(data.total || 0);
      setTotalPages(Math.ceil((data.total || 0) / pageSize) || 1);
    } catch (errorValue) {
      if (requestId === requestIdRef.current) {
        setError(getApiErrorMessage(errorValue, `加载${config.type === 'lost' ? '失物' : '招领'}信息失败`));
      }
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [page, searchKeyword, categoryId, status, config]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleSearch = () => {
    setSearchKeyword(keyword);
    if (page === 1) {
      if (keyword === searchKeyword) fetchItems();
    } else {
      setPage(1);
    }
  };

  const handlePageChange = (_: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
    window.scrollTo(0, 0);
  };

  const formatTime = (item: T) => {
    const timeStr = config.getTimeValue(item);
    const endStr = config.getTimeEndValue?.(item);
    if (!timeStr) return '';
    const base = new Date(timeStr).toLocaleString('zh-CN');
    return endStr ? `${base} ~ ${new Date(endStr).toLocaleString('zh-CN')}` : base;
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ pb: 1, mb: 3, borderBottom: 2, borderColor: 'primary.main', display: 'inline-block' }}>
        {config.title}
      </Typography>

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
            {config.statusOptions.map(opt => (
              <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
            ))}
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
            onClick={() => navigate(config.createPath)}
            sx={{ ml: 'auto' }}
          >
            {config.createButtonText}
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
          <Typography variant="h6" color="text.secondary">{config.emptyText}</Typography>
          {user && (
            <Button variant="contained" sx={{ mt: 2 }} onClick={() => navigate(config.createPath)}>
              {config.emptyActionText}
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
                    onClick={() => navigate(`${config.detailPath}/${item.id}`)}
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
                        {config.getStatusChip(item.status)}
                      </Box>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1 }}>
                        <Chip label={item.categoryName} size="small" variant="outlined" />
                      </Box>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        地点：{item.location}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {config.getTimeLabel(item)}：{formatTime(item)}
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
