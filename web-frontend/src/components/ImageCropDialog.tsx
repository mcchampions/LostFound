import { useState, useCallback, useEffect } from 'react';
import { Alert, Dialog, DialogTitle, DialogContent, DialogActions, Button, Slider, Typography, Box, IconButton } from '@mui/material';
import { RotateRight as RotateRightIcon } from '@mui/icons-material';
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

const createImage = (url: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('load failed'));
    img.src = url;
  });

export default function ImageCropDialog({ open, imageUrl, onClose, onCropped, circular, aspect }: Props) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  // 工作图：旋转后用 canvas 生成的新图，cropper 始终拿它、rotation=0，避免 cropper 旋转联动缩放
  const [workingUrl, setWorkingUrl] = useState(imageUrl);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [processing, setProcessing] = useState(false);
  const [processingError, setProcessingError] = useState('');

  // 图片源变化时重置工作图（并释放之前旋转产生的 blob）
  useEffect(() => {
    setWorkingUrl(prev => {
      if (prev && prev.startsWith('blob:') && prev !== imageUrl) URL.revokeObjectURL(prev);
      return imageUrl;
    });
    setCrop({ x: 0, y: 0 });
    setZoom(1);
  }, [imageUrl]);

  // 组件卸载时释放旋转 blob
  useEffect(() => () => {
    if (workingUrl && workingUrl.startsWith('blob:') && workingUrl !== imageUrl) {
      URL.revokeObjectURL(workingUrl);
    }
  }, [workingUrl, imageUrl]);

  const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  // 真正把图片旋转 90°（生成新图），预览即所得
  const handleRotate = async () => {
    try {
      const img = await createImage(workingUrl);
      const canvas = document.createElement('canvas');
      canvas.width = img.height;
      canvas.height = img.width;
      const ctx = canvas.getContext('2d')!;
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(Math.PI / 2);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      const blob = await new Promise<Blob | null>(resolve =>
        canvas.toBlob(resolve, 'image/jpeg', 0.95)
      );
      if (!blob) return;
      setWorkingUrl(prev => {
        if (prev && prev.startsWith('blob:') && prev !== imageUrl) URL.revokeObjectURL(prev);
        return URL.createObjectURL(blob);
      });
      setCrop({ x: 0, y: 0 });
      setZoom(1);
    } catch {
      /* ignore */
    }
  };

  const handleConfirm = async () => {
    if (!croppedAreaPixels) return;
    setProcessing(true);
    setProcessingError('');
    try {
      const img = await createImage(workingUrl);
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
      setProcessingError('裁剪或上传失败，请重试；未保存临时图片地址。');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>裁剪封面</DialogTitle>
      <DialogContent>
        {processingError && <Alert severity="error" sx={{ mb: 1 }}>{processingError}</Alert>}
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          拖动调整位置，滑动缩放，点击旋转修正方向。裁剪后的区域将作为封面显示。
        </Typography>
        <Box sx={{ position: 'relative', width: '100%', height: 350, bgcolor: '#333', borderRadius: 1, overflow: 'hidden' }}>
          <Cropper
            image={workingUrl}
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
          <IconButton size="small" onClick={handleRotate} title="旋转 90°">
            <RotateRightIcon />
          </IconButton>
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
