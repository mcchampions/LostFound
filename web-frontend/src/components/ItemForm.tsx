import { useCallback, useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Box, Typography, Paper, TextField, Button, Select, MenuItem,
  FormControl, InputLabel, Alert, CircularProgress, IconButton
} from '@mui/material';
import { Save as SaveIcon, ArrowBack as BackIcon, Close as CloseIcon, AddPhotoAlternate as AddPhotoIcon, TextFields as TextFieldsIcon } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { getCategories } from '../api/categories';
import type { Category } from '../api/categories';
import ItemImageUpload from './ItemImageUpload';
import ImageCropDialog from './ImageCropDialog';
import TextCoverDialog from './TextCoverDialog';
import DateTimeRangePicker, { formatLocalDateTime } from './DateTimeRangePicker';
import { uploadImage } from '../api/upload';
import { assetUrl } from '../config';
import { getApiErrorMessage } from '../api/errors';

export interface ItemFormValues {
  title: string;
  categoryId: number | '';
  description: string;
  location: string;
  timeStart: string;
  timeEnd: string;
  imageUrls: string[];
  coverImage: string;
}

export interface ItemFormConfig<TItem, TPayload> {
  type: 'lost' | 'found';
  title: { create: string; edit: string };
  timeLabel: string;
  locationLabel: string;
  fetchItem: (id: number) => Promise<TItem>;
  createItem: (data: TPayload) => Promise<unknown>;
  updateItem: (id: number, data: TPayload) => Promise<unknown>;
  toFormValues: (item: TItem) => ItemFormValues;
  toPayload: (values: ItemFormValues) => TPayload;
  listPath: string;
}

export default function ItemForm<TItem, TPayload>({ config }: { config: ItemFormConfig<TItem, TPayload> }) {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const routeLocation = useLocation();

  const isEdit = Boolean(id);
  const existingItem = (routeLocation.state as { item?: TItem } | null)?.item;

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEdit);
  const [error, setError] = useState('');
  const [timeError, setTimeError] = useState('');

  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [description, setDescription] = useState('');
  const [locationVal, setLocationVal] = useState('');
  const [timeStart, setTimeStart] = useState('');
  const [timeEnd, setTimeEnd] = useState('');
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [coverImage, setCoverImage] = useState<string>('');
  const [cropOpen, setCropOpen] = useState(false);
  const [textCoverOpen, setTextCoverOpen] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // 时间实时校验
  const nowLocal = formatLocalDateTime(new Date());
  const timeRangeInvalid = Boolean(timeStart && timeEnd && timeEnd < timeStart);
  const timeInFuture = Boolean(
    (timeStart && timeStart > nowLocal) || (timeEnd && timeEnd > nowLocal)
  );
  const timeInvalid = timeRangeInvalid || timeInFuture;

  const populateForm = useCallback((item: TItem) => {
    const values = config.toFormValues(item);
    setTitle(values.title);
    setCategoryId(values.categoryId);
    setDescription(values.description);
    setLocationVal(values.location);
    setTimeStart(values.timeStart);
    setTimeEnd(values.timeEnd);
    setImageUrls(values.imageUrls);
    setCoverImage(values.coverImage);
  }, [config]);

  useEffect(() => {
    getCategories()
      .then(setCategories)
      .catch(errorValue => setError(getApiErrorMessage(errorValue, t('items.loadCategoriesFailed'))));

    if (isEdit && existingItem) {
      populateForm(existingItem);
      setFetching(false);
    } else if (isEdit && id) {
      config.fetchItem(Number(id))
        .then(data => {
          populateForm(data);
          setFetching(false);
        })
        .catch(errorValue => {
          setError(getApiErrorMessage(errorValue, t('items.loadFailed', { name: config.type === 'lost' ? t('lostItem.infoName') : t('foundItem.infoName') })));
          setFetching(false);
        });
    }
  }, [config, existingItem, id, isEdit, populateForm, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setError(t('items.enterTitle'));
      return;
    }
    if (!categoryId) {
      setError(t('items.selectCategory'));
      return;
    }
    if (!locationVal.trim()) {
      setError(t('items.enterLocation', { name: config.locationLabel }));
      return;
    }
    if (!timeStart) {
      setError(t('items.selectTime', { name: config.timeLabel }));
      setTimeError(t('items.selectTime', { name: config.timeLabel }));
      return;
    }
    if (timeEnd && timeEnd < timeStart) {
      setError(t('items.timeRangeInvalid'));
      setTimeError(t('items.timeRangeInvalid'));
      return;
    }
    if (timeInFuture) {
      setError(t('items.timeInFuture'));
      setTimeError(t('items.timeInFuture'));
      return;
    }

    const payload = config.toPayload({
      title: title.trim(),
      categoryId,
      description: description.trim(),
      location: locationVal.trim(),
      timeStart,
      timeEnd,
      imageUrls,
      coverImage,
    });

    setError('');
    setLoading(true);

    try {
      if (isEdit && id) {
        await config.updateItem(Number(id), payload);
      } else {
        await config.createItem(payload);
      }
      navigate(config.listPath);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, t('items.saveFailed', { action: isEdit ? t('items.update') : t('items.publish') })));
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
          {isEdit ? config.title.edit : config.title.create}
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            fullWidth margin="normal"
            label={t('common.itemName')} required
            value={title}
            onChange={e => setTitle(e.target.value)}
          />

          <FormControl fullWidth margin="normal" required>
            <InputLabel>{t('common.itemCategory')}</InputLabel>
            <Select
              value={categoryId}
              label={t('common.itemCategory')}
              onChange={e => setCategoryId(e.target.value as number)}
            >
              {categories.map(cat => (
                <MenuItem key={cat.id} value={cat.id}>{cat.name}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            fullWidth margin="normal"
            label={config.locationLabel} required
            value={locationVal}
            onChange={e => setLocationVal(e.target.value)}
          />

          <DateTimeRangePicker
            label={config.timeLabel}
            startLabel={t('common.start')}
            endLabel={t('common.end')}
            startValue={timeStart}
            endValue={timeEnd}
            onStartChange={(value) => {
              setTimeStart(value);
              if (timeError) setTimeError('');
            }}
            onEndChange={(value) => {
              setTimeEnd(value);
              if (timeError) setTimeError('');
            }}
            required
            error={!!timeError}
            helperText={timeError || t('common.timeRangeHelper')}
          />

          <TextField
            fullWidth margin="normal"
            label={t('common.description')}
            multiline rows={4}
            value={description}
            onChange={e => setDescription(e.target.value)}
          />

          {/* Cover image */}
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>{t('common.coverImage')}</Typography>
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
                  {t('items.cropCover')}
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
                  {t('items.uploadCover')}
                </Button>
                <Button variant="outlined" startIcon={<TextFieldsIcon />} onClick={() => setTextCoverOpen(true)} disabled={timeInvalid} sx={{ ml: 1 }}>
                  {t('items.generateTextCover')}
                </Button>
              </Box>
            )}
            <ImageCropDialog open={cropOpen} imageUrl={assetUrl(coverImage)}
              aspect={16 / 9}
              onClose={() => setCropOpen(false)} onCropped={setCoverImage} />
            <TextCoverDialog open={textCoverOpen} initialTitle={title} initialContent={description}
              initialCategory={categories.find(category => category.id === categoryId)?.name}
              initialLocation={locationVal} initialDate={timeStart} initialDateEnd={timeEnd}
              onClose={() => setTextCoverOpen(false)} onGenerated={setCoverImage} />
          </Box>

          {/* Other images */}
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>{t('items.otherImages')}</Typography>
            <ItemImageUpload images={imageUrls} onChange={setImageUrls} />
          </Box>

          <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
            <Button
              type="submit"
              variant="contained"
              startIcon={<SaveIcon />}
              disabled={loading}
            >
              {loading ? t('common.submitting') : (isEdit ? t('common.save') : t('items.publishButton'))}
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
