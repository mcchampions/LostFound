import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Box, Typography, Paper, TextField, Button, Select, MenuItem,
  FormControl, InputLabel, Alert, CircularProgress, IconButton
} from '@mui/material';
import { Save as SaveIcon, ArrowBack as BackIcon, Close as CloseIcon, AddPhotoAlternate as AddPhotoIcon } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { getCategories } from '../api/categories';
import type { Category } from '../api/categories';
import { createLostItem, updateLostItem, getLostItem } from '../api/lostItems';
import ItemImageUpload from '../components/ItemImageUpload';
import ImageCropDialog from '../components/ImageCropDialog';
import { uploadImage } from '../api/upload';
import { assetUrl } from '../config';

export default function LostItemForm() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const routeLocation = useLocation();

  const isEdit = Boolean(id);
  const existingItem = (routeLocation.state as any)?.item;

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEdit);
  const [error, setError] = useState('');

  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [description, setDescription] = useState('');
  const [locationVal, setLocationVal] = useState('');
  const [lostTime, setLostTime] = useState('');
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [coverImage, setCoverImage] = useState<string>('');
  const [cropOpen, setCropOpen] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getCategories().then(setCategories).catch(() => {});

    if (isEdit && existingItem) {
      populateForm(existingItem);
      setFetching(false);
    } else if (isEdit && id) {
      getLostItem(Number(id))
        .then(data => {
          populateForm(data);
          setFetching(false);
        })
        .catch(() => {
          setError('加载失物信息失败');
          setFetching(false);
        });
    }
  }, [id]);

  const populateForm = (item: any) => {
    setTitle(item.title || '');
    setCategoryId(item.categoryId || '');
    setDescription(item.description || '');
    setLocationVal(item.location || '');
    setLostTime(item.lostTime ? item.lostTime.substring(0, 16) : '');
    setImageUrls(item.imageUrls || []);
    setCoverImage(item.coverImage || '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setError('请输入物品名称');
      return;
    }
    if (!categoryId) {
      setError('请选择分类');
      return;
    }
    if (!locationVal.trim()) {
      setError('请输入丢失地点');
      return;
    }

    const payload = {
      title: title.trim(),
      categoryId,
      description: description.trim(),
      location: locationVal.trim(),
      lostTime: lostTime ? new Date(lostTime).toISOString() : new Date().toISOString(),
      imageUrls,
      coverImage: coverImage || null,
    };

    setError('');
    setLoading(true);

    try {
      if (isEdit && id) {
        await updateLostItem(Number(id), payload);
      } else {
        await createLostItem(payload);
      }
      navigate('/lost-items');
    } catch (err: any) {
      setError(err.response?.data?.message || `${isEdit ? '更新' : '发布'}失败`);
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Button startIcon={<BackIcon />} onClick={() => navigate(-1)} sx={{ mb: 2 }}>
        {t('common.back')}
      </Button>

      <Paper sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
        <Typography variant="h5" gutterBottom>
          {isEdit ? '编辑失物信息' : '发布失物信息'}
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            fullWidth margin="normal"
            label="物品名称" required
            value={title}
            onChange={e => setTitle(e.target.value)}
          />

          <FormControl fullWidth margin="normal" required>
            <InputLabel>物品分类</InputLabel>
            <Select
              value={categoryId}
              label="物品分类"
              onChange={e => setCategoryId(e.target.value as number)}
            >
              {categories.map(cat => (
                <MenuItem key={cat.id} value={cat.id}>{cat.name}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            fullWidth margin="normal"
            label="丢失地点" required
            value={locationVal}
            onChange={e => setLocationVal(e.target.value)}
          />

          <TextField
            fullWidth margin="normal"
            type="datetime-local"
            label="丢失时间"
            value={lostTime}
            onChange={e => setLostTime(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />

          <TextField
            fullWidth margin="normal"
            label="详细描述"
            multiline rows={4}
            value={description}
            onChange={e => setDescription(e.target.value)}
          />

          {/* Cover image */}
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>封面图片</Typography>
            {coverImage ? (
              <Box sx={{ position: 'relative', width: 240, aspectRatio: '16 / 9', borderRadius: 1, overflow: 'hidden' }}>
                <Box component="img" src={assetUrl(coverImage)}
                  sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <IconButton size="small" onClick={() => setCoverImage('')}
                  sx={{ position: 'absolute', top: 4, right: 4, bgcolor: 'rgba(0,0,0,0.5)', color: 'white' }}>
                  <CloseIcon sx={{ fontSize: 14 }} />
                </IconButton>
                <Button size="small" onClick={() => setCropOpen(true)}
                  sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, bgcolor: 'rgba(0,0,0,0.6)', color: 'white', fontSize: 10, borderRadius: 0 }}>
                  裁剪封面
                </Button>
              </Box>
            ) : (
              <Box>
                <input type="file" accept="image/*" ref={coverInputRef} style={{ display: 'none' }}
                  onChange={async (e) => {
                    const f = e.target.files?.[0]; if (!f) return;
                    const url = await uploadImage(f);
                    setCoverImage(url);
                    e.target.value = '';
                  }} />
                <Button variant="outlined" startIcon={<AddPhotoIcon />} onClick={() => coverInputRef.current?.click()}>
                  上传封面
                </Button>
              </Box>
            )}
            <ImageCropDialog open={cropOpen} imageUrl={assetUrl(coverImage)}
              aspect={16 / 9}
              onClose={() => setCropOpen(false)} onCropped={setCoverImage} />
          </Box>

          {/* Other images */}
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>其他图片（最多4张）</Typography>
            <ItemImageUpload images={imageUrls} onChange={setImageUrls} />
          </Box>

          <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
            <Button
              type="submit"
              variant="contained"
              startIcon={<SaveIcon />}
              disabled={loading}
            >
              {loading ? '提交中...' : (isEdit ? '保存' : '发布')}
            </Button>
            <Button variant="outlined" onClick={() => navigate(-1)}>
              {t('common.cancel')}
            </Button>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}
