import { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField,
  Box, Typography, CircularProgress, Alert, MenuItem, Select, FormControl, InputLabel
} from '@mui/material';
import { generateCover } from '../api/cover';
import { assetUrl } from '../config';

interface Props {
  open: boolean;
  initialTitle?: string;
  onClose: () => void;
  onGenerated: (url: string) => void;
}

const TEMPLATES = [
  { value: 'xhs-note', label: '经典笔记' },
  { value: 'xhs-note-green', label: '绿色笔记' },
  { value: 'xhs-quote-blue', label: '蓝色引用' },
  { value: 'xhs-date-note', label: '日期手写' },
];

const THEMES = [
  { value: 'cream', label: '奶油色' },
  { value: 'blue', label: '蓝色' },
  { value: 'green', label: '绿色' },
];

export default function TextCoverDialog({ open, initialTitle, onClose, onGenerated }: Props) {
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [template, setTemplate] = useState('xhs-note');
  const [theme, setTheme] = useState('cream');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');

  useEffect(() => {
    if (open && initialTitle) {
      setTitle(initialTitle);
    }
  }, [open, initialTitle]);

  const handleGenerate = async () => {
    if (!title.trim()) {
      setError('请输入标题');
      return;
    }
    setLoading(true);
    setError('');
    setPreviewUrl('');
    try {
      const res = await generateCover({
        title: title.trim(),
        subtitle: subtitle.trim() || undefined,
        template,
        theme,
      });
      setPreviewUrl(res.url);
    } catch (err: any) {
      setError(err.response?.data?.message || '生成失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    if (previewUrl) {
      onGenerated(previewUrl);
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>生成文字封面</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <TextField
          autoFocus fullWidth margin="normal"
          label="标题"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="输入封面标题"
          helperText="可用回车手动换行控制排版"
          multiline maxRows={3}
        />
        <TextField
          fullWidth margin="normal"
          label="副标题（可选）"
          value={subtitle}
          onChange={e => setSubtitle(e.target.value)}
          placeholder="输入副标题"
        />
        <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>模板</InputLabel>
            <Select value={template} label="模板" onChange={e => setTemplate(e.target.value)}>
              {TEMPLATES.map(t => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>配色</InputLabel>
            <Select value={theme} label="配色" onChange={e => setTheme(e.target.value)}>
              {THEMES.map(t => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
            </Select>
          </FormControl>
        </Box>
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
          <Button variant="contained" onClick={handleGenerate} disabled={loading} startIcon={loading ? <CircularProgress size={16} /> : undefined}>
            {loading ? '生成中...' : '生成预览'}
          </Button>
        </Box>
        {previewUrl && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" color="text.secondary">预览效果：</Typography>
            <Box sx={{ width: '100%', aspectRatio: '16 / 9', borderRadius: 1, overflow: 'hidden', mt: 0.5, border: 1, borderColor: 'divider' }}>
              <Box component="img" src={assetUrl(previewUrl)} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </Box>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>取消</Button>
        <Button onClick={handleConfirm} variant="contained" disabled={!previewUrl}>
          使用此封面
        </Button>
      </DialogActions>
    </Dialog>
  );
}
