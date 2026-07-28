import { useState, useCallback } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Slider, Typography, Box } from '@mui/material';
import Cropper from 'react-easy-crop';
import type { Area } from 'react-easy-crop';
import { uploadImage } from '../api/upload';

interface Props {
  open: boolean;
  imageUrl: string;
  onClose: () => void;
  onCropped: (url: string) => void;
  circular?: boolean;
  aspect?: number;
}

export default function ImageCropDialog({ open, imageUrl, onClose, onCropped, circular, aspect }: Props) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [processing, setProcessing] = useState(false);

  const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleConfirm = async () => {
    if (!croppedAreaPixels) return;
    setProcessing(true);
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = imageUrl;
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('load failed'));
      });

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      canvas.width = croppedAreaPixels.width;
      canvas.height = croppedAreaPixels.height;

      ctx.drawImage(
        img,
        croppedAreaPixels.x, croppedAreaPixels.y,
        croppedAreaPixels.width, croppedAreaPixels.height,
        0, 0,
        croppedAreaPixels.width, croppedAreaPixels.height
      );

      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9));
      if (!blob) throw new Error('crop failed');

      const file = new File([blob], 'cover.jpg', { type: 'image/jpeg' });
      const url = await uploadImage(file);
      onCropped(url);
      onClose();
    } catch {
      // fallback: use original URL
      onCropped(imageUrl);
      onClose();
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>裁剪封面</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          拖动图片调整位置，滑动缩放。裁剪后的区域将作为列表封面显示。
        </Typography>
        <Box sx={{ position: 'relative', width: '100%', height: 350, bgcolor: '#333', borderRadius: 1, overflow: 'hidden' }}>
          <Cropper
            image={imageUrl}
            crop={crop}
            zoom={zoom}
            aspect={aspect ?? 9 / 16}
            cropShape={circular ? 'round' : 'rect'}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2 }}>
          <Typography variant="body2">缩放</Typography>
          <Slider min={1} max={3} step={0.01} value={zoom}
            onChange={(_, v) => setZoom(v as number)} sx={{ flex: 1 }} />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>取消</Button>
        <Button variant="contained" onClick={handleConfirm} disabled={processing}>
          {processing ? '处理中...' : '确认裁剪'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
