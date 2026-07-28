import { useState } from 'react';
import {
  Box, Button, IconButton, Typography, LinearProgress, Paper, Dialog
} from '@mui/material';
import {
  Close as CloseIcon, AddPhotoAlternate as AddPhotoIcon,
  ZoomIn as ZoomInIcon
} from '@mui/icons-material';
import { uploadImage } from '../api/upload';
import { assetUrl } from '../config';

interface Props {
  images: string[];
  onChange: (urls: string[]) => void;
}

export default function ItemImageUpload({ images, onChange }: Props) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number[]>([]);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remaining = 4 - images.length;
    const toUpload = Array.from(files).slice(0, remaining);
    if (toUpload.length === 0) return;

    setUploading(true);
    setUploadProgress(new Array(toUpload.length).fill(0));

    const newUrls: string[] = [];
    for (let i = 0; i < toUpload.length; i++) {
      setUploadProgress(prev => { const next = [...prev]; next[i] = 30; return next; });
      try {
        const url = await uploadImage(toUpload[i]);
        newUrls.push(url);
        setUploadProgress(prev => { const next = [...prev]; next[i] = 100; return next; });
      } catch {
        setUploadProgress(prev => { const next = [...prev]; next[i] = -1; return next; });
      }
    }
    onChange([...images, ...newUrls]);
    setUploading(false);
    setUploadProgress([]);
    e.target.value = '';
  };

  const handleRemove = (index: number) => {
    onChange(images.filter((_, i) => i !== index));
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
        {images.map((url, index) => (
          <Paper
            key={url}
            sx={{
              width: 100, height: 100, position: 'relative', overflow: 'hidden',
              borderRadius: 1, cursor: 'pointer',
            }}
          >
            <Box
              component="img"
              src={assetUrl(url)}
              alt={`preview-${index}`}
              sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onClick={() => setPreview(assetUrl(url))}
            />
            <Box sx={{ position: 'absolute', top: 2, right: 2, display: 'flex', gap: 0.2 }}>
              <IconButton size="small"
                onClick={() => setPreview(assetUrl(url))}
                sx={{ bgcolor: 'rgba(0,0,0,0.5)', color: 'white', width: 18, height: 18,
                  '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' } }}>
                <ZoomInIcon sx={{ fontSize: 12 }} />
              </IconButton>
              <IconButton size="small"
                onClick={() => handleRemove(index)}
                sx={{ bgcolor: 'rgba(0,0,0,0.5)', color: 'white', width: 18, height: 18,
                  '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' } }}>
                <CloseIcon sx={{ fontSize: 12 }} />
              </IconButton>
            </Box>
          </Paper>
        ))}

        {images.length < 4 && (
          <Button component="label" variant="outlined"
            sx={{ width: 100, height: 100, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', borderRadius: 1 }}
            disabled={uploading}
          >
            <AddPhotoIcon />
            <Typography variant="caption">上传图片</Typography>
            <input type="file" accept="image/*" multiple hidden onChange={handleFileSelect} />
          </Button>
        )}
      </Box>

      {uploading && uploadProgress.map((p, i) => (
        <Box key={i} sx={{ mb: 0.5 }}>
          <Typography variant="caption">
            上传图片 {i + 1}{p === -1 ? ' 失败' : p === 100 ? ' 完成' : ` ${p}%`}
          </Typography>
          <LinearProgress
            variant="determinate" value={p === -1 ? 100 : p}
            color={p === -1 ? 'error' : 'primary'} sx={{ height: 4, borderRadius: 2 }}
          />
        </Box>
      ))}

      {/* Fullscreen preview */}
      <Dialog open={!!preview} onClose={() => setPreview(null)} maxWidth="lg"
        slotProps={{ paper: { sx: { bgcolor: 'transparent', boxShadow: 'none', maxWidth: '90vw', maxHeight: '90vh' } }}}>
        {preview && (
          <Box component="img" src={preview}
            sx={{ maxWidth: '100%', maxHeight: '85vh', objectFit: 'contain', borderRadius: 1 }} />
        )}
      </Dialog>

    </Box>
  );
}
