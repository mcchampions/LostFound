import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Box, Typography, Paper, TextField, Button, Select, MenuItem,
  FormControl, InputLabel, Alert, CircularProgress, IconButton
} from '@mui/material';
import { Save as SaveIcon, ArrowBack as BackIcon, Close as CloseIcon, AddPhotoAlternate as AddPhotoIcon, TextFields as TextFieldsIcon } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { getCategories } from '../api/categories';
import type { Category } from '../api/categories';
import { createFoundItem, updateFoundItem, getFoundItem } from '../api/foundItems';
import ItemImageUpload from '../components/ItemImageUpload';
import ImageCropDialog from '../components/ImageCropDialog';
import TextCoverDialog from '../components/TextCoverDialog';
import DateTimeRangePicker, { formatLocalDateTime } from '../components/DateTimeRangePicker';
import { uploadImage } from '../api/upload';
import { assetUrl } from '../config';

export default function FoundItemForm() {
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
  const [timeError, setTimeError] = useState('');

  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [description, setDescription] = useState('');
  const [locationVal, setLocationVal] = useState('');
  const [foundTime, setFoundTime] = useState('');
  const [foundTimeEnd, setFoundTimeEnd] = useState('');
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [coverImage, setCoverImage] = useState<string>('');
  const [cropOpen, setCropOpen] = useState(false);
  const [textCoverOpen, setTextCoverOpen] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // 时间实时校验：结束早于开始、或任何时间晚于当前时间时，阻止封面生成等后端操作
  const nowLocal = formatLocalDateTime(new Date());
  const timeRangeInvalid = Boolean(foundTime && foundTimeEnd && foundTimeEnd < foundTime);
  const timeInFuture = Boolean(
    (foundTime && foundTime > nowLocal) || (foundTimeEnd && foundTimeEnd > nowLocal)
  );
  const timeInvalid = timeRangeInvalid || timeInFuture;

  useEffect(() => {
    getCategories().then(setCategories).catch(() => {});

    if (isEdit && existingItem) {
      populateForm(existingItem);
      setFetching(false);
    } else if (isEdit && id) {
      getFoundItem(Number(id))
        .then(data => {
          populateForm(data);
          setFetching(false);
        })
        .catch(() => {
          setError('加载招领信息失败');
          setFetching(false);
        });
    }
  }, [id]);

  const populateForm = (item: any) => {
    setTitle(item.title || '');
    setCategoryId(item.categoryId || '');
    setDescription(item.description || '');
    setLocationVal(item.location || '');
    setFoundTime(item.foundTime ? item.foundTime.substring(0, 16) : '');
    setFoundTimeEnd(item.foundTimeEnd ? item.foundTimeEnd.substring(0, 16) : '');
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
      setError('请输入发现地点');
      return;
    }
    if (!foundTime) {
      setError('请选择发现时间');
      setTimeError('请选择发现时间');
      return;
    }
    if (foundTimeEnd && foundTimeEnd < foundTime) {
      setError('结束时间不能早于开始时间');
      setTimeError('结束时间不能早于开始时间');
      return;
    }
    if (timeInFuture) {
      setError('时间不能晚于当前时间');
      setTimeError('时间不能晚于当前时间');
      return;
    }

    const payload = {
      title: title.trim(),
      categoryId,
      description: description.trim(),
      location: locationVal.trim(),
      foundTime,
      foundTimeEnd: foundTimeEnd || null,
      imageUrls,
      coverImage: coverImage || null,
    };

    setError('');
    setLoading(true);

    try {
      if (isEdit && id) {
        await updateFoundItem(Number(id), payload);
      } else {
        await createFoundItem(payload);
      }
      navigate('/found-items');
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
          {isEdit ? '编辑招领信息' : '发布招领信息'}
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
            label="发现地点" required
            value={locationVal}
            onChange={e => setLocationVal(e.target.value)}
          />

          <DateTimeRangePicker
            label="发现时间"
            startLabel="开始"
            endLabel="结束"
            startValue={foundTime}
            endValue={foundTimeEnd}
            onStartChange={(value) => {
              setFoundTime(value);
              if (timeError) setTimeError('');
            }}
            onEndChange={(value) => {
              setFoundTimeEnd(value);
              if (timeError) setTimeError('');
            }}
            required
            error={!!timeError}
            helperText={timeError || '可只填开始时间，表示某个时刻；填写结束时间则表示时间范围'}
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
                <Button variant="outlined" startIcon={<TextFieldsIcon />} onClick={() => setTextCoverOpen(true)} disabled={timeInvalid} sx={{ ml: 1 }}>
                  生成文字封面
                </Button>
              </Box>
            )}
            <ImageCropDialog open={cropOpen} imageUrl={assetUrl(coverImage)}
              aspect={16 / 9}
              onClose={() => setCropOpen(false)} onCropped={setCoverImage} />
            <TextCoverDialog open={textCoverOpen} initialTitle={title} initialContent={description}
              initialCategory={categories.find(category => category.id === categoryId)?.name}
              initialLocation={locationVal} initialDate={foundTime} initialDateEnd={foundTimeEnd}
              onClose={() => setTextCoverOpen(false)} onGenerated={setCoverImage} />
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
