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
  initialDateEnd?: string;
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

const MAX_CONTENT_LENGTH = 144;

const truncateContent = (value: string) => {
  const normalized = value.replace(/\r\n?/g, '\n').trim();
  return Array.from(normalized).length > MAX_CONTENT_LENGTH
    ? `${Array.from(normalized).slice(0, MAX_CONTENT_LENGTH - 1).join('')}…`
    : normalized;
};

const coverErrorMessage = (error: unknown) => {
  const response = (error as {
    response?: { status?: number; data?: { code?: number; message?: string } }
  })?.response;
  const message = response?.data?.message;
  if (response?.status === 429 || response?.data?.code === 429) {
    return message || '已达到封面生成速率限制，请稍后再试';
  }
  return message || '生成失败，请重试';
};

const pad2 = (n: number) => String(n).padStart(2, '0');

/**
 * 把 "YYYY-MM-DDTHH:mm[:ss]"（datetime-local / 后端 LocalDateTime 序列化）
 * 解析为本地时间 Date。带时区后缀（Z 或 ±HH:mm）的字符串按标准 ISO 解析。
 * 不带秒的写法在部分浏览器（如 Safari）会被 new Date 判为无效，这里手工构造，
 * 保证各浏览器行为一致。解析失败返回 null，绝不把原始字符串回传给封面。
 */
const parseLocalDateTime = (value: string): Date | null => {
  const raw = value.trim();
  if (!raw) return null;
  const match = raw.match(
    /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?(Z|[+-]\d{2}:?\d{2})?$/
  );
  if (!match) return null;
  if (match[7]) {
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  const date = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4]),
    Number(match[5]),
    match[6] ? Number(match[6]) : 0
  );
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatCoverDate = (start?: string, end?: string) => {
  const fmt = (d: Date) =>
    `${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  const startDate = parseLocalDateTime(start || '');
  const endDate = parseLocalDateTime(end || '');
  if (!startDate && !endDate) return '';
  if (!startDate) return fmt(endDate!);
  if (!endDate) return fmt(startDate);
  const sameDay = startDate.toDateString() === endDate.toDateString();
  return sameDay
    ? `${fmt(startDate)}~${pad2(endDate.getHours())}:${pad2(endDate.getMinutes())}`
    : `${fmt(startDate)} ~ ${fmt(endDate)}`;
};

export default function TextCoverDialog({
  open,
  initialTitle,
  initialContent,
  initialCategory,
  initialLocation,
  initialDate,
  initialDateEnd,
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
    // 封面生成前的最后一道校验：时间范围无效时不调用后端接口
    const startDate = parseLocalDateTime(initialDate || '');
    const endDate = parseLocalDateTime(initialDateEnd || '');
    if (startDate && endDate && endDate.getTime() < startDate.getTime()) {
      setError('时间范围无效：结束时间不能早于开始时间');
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
        date: formatCoverDate(initialDate, initialDateEnd),
        template,
        theme,
      });
      setPreviewUrl(res.url);
    } catch (err: unknown) {
      setError(coverErrorMessage(err));
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
          helperText="可用回车手动换行；超长标题会自动折行并截断（最多 4 行），不会溢出封面"
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
