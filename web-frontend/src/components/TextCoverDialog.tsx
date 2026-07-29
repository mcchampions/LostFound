import { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField,
  Box, Typography, CircularProgress, Alert, MenuItem, Select, FormControl, InputLabel
} from '@mui/material';
import { ContentPaste as ContentPasteIcon } from '@mui/icons-material';
import { generateCover } from '../api/cover';
import { assetUrl } from '../config';

interface Props {
  open: boolean;
  initialTitle?: string;
  initialContent?: string;
  initialCategory?: string;
  initialLocation?: string;
  initialDate?: string;
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

const MAX_CONTENT_LENGTH = 72;

const truncateContent = (value: string) => {
  const normalized = value.replace(/\s+/g, ' ').trim();
  return Array.from(normalized).length > MAX_CONTENT_LENGTH
    ? `${Array.from(normalized).slice(0, MAX_CONTENT_LENGTH - 1).join('')}…`
    : normalized;
};

const formatCoverDate = (value?: string) => {
  const date = value?.trim() ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return value || '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function TextCoverDialog({
  open,
  initialTitle,
  initialContent,
  initialCategory,
  initialLocation,
  initialDate,
  onClose,
  onGenerated,
}: Props) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [template, setTemplate] = useState('xhs-note');
  const [theme, setTheme] = useState('cream');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');

  useEffect(() => {
    if (open) {
      setTitle(initialTitle || '');
      setContent('');
      setPreviewUrl('');
      setError('');
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
      const renderedContent = truncateContent(content);
      setContent(renderedContent);
      const res = await generateCover({
        title: title.trim(),
        content: renderedContent || undefined,
        category: initialCategory?.trim() || undefined,
        location: initialLocation?.trim() || undefined,
        date: formatCoverDate(initialDate),
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
          label="正文（可选）"
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="输入需要显示在封面上的正文"
          helperText={`生成时最多保留 ${MAX_CONTENT_LENGTH} 个字符，超出部分自动以省略号结尾`}
          multiline
          minRows={3}
          maxRows={5}
        />
        <Button
          size="small"
          startIcon={<ContentPasteIcon />}
          onClick={() => setContent(truncateContent(initialContent || ''))}
          disabled={!initialContent?.trim()}
        >
          填入原文
        </Button>
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
              <Box component="img" src={assetUrl(previewUrl)} sx={{ width: '100%', height: '100%', objectFit: 'contain' }} />
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
