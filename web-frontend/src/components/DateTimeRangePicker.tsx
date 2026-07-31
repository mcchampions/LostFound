import { useState } from 'react';
import { Box, TextField, Typography } from '@mui/material';

interface DateTimeRangePickerProps {
  label: string;
  startLabel?: string;
  endLabel?: string;
  startValue: string;
  endValue: string;
  onStartChange: (value: string) => void;
  onEndChange: (value: string) => void;
  required?: boolean;
  error?: boolean;
  helperText?: string;
  disabled?: boolean;
}

/**
 * 统一的「开始 ~ 结束」时间范围控件。
 * 输入值格式为原生 datetime-local 的 "YYYY-MM-DDTHH:mm"，不做任何时区换算，
 * 直接作为本地时间提交，保证与后端 LocalDateTime 语义一致。
 */
export default function DateTimeRangePicker({
  label,
  startLabel = '开始',
  endLabel = '结束',
  startValue,
  endValue,
  onStartChange,
  onEndChange,
  required = false,
  error = false,
  helperText,
  disabled = false,
}: DateTimeRangePickerProps) {
  const [focused, setFocused] = useState(false);

  const handleStartChange = (value: string) => {
    onStartChange(value);
    // 开始时间晚于已有结束时间时自动清空结束时间，避免产生无效区间
    if (endValue && value && value > endValue) {
      onEndChange('');
    }
  };

  return (
    <Box sx={{ mt: 2 }}>
      <Typography
        variant="body2"
        sx={{
          mb: 0.5,
          color: error ? 'error.main' : focused ? 'primary.main' : 'text.secondary',
        }}
      >
        {label}
        {required && (
          <Box component="span" sx={{ color: 'error.main', ml: 0.5 }}>
            *
          </Box>
        )}
      </Typography>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 1.5,
          py: 0.75,
          borderRadius: 1,
          border: 1,
          borderColor: error ? 'error.main' : focused ? 'primary.main' : 'divider',
          bgcolor: disabled ? 'action.hover' : 'background.paper',
          transition: 'border-color 120ms ease',
          '&:hover': {
            borderColor: error ? 'error.main' : focused ? 'primary.main' : 'text.primary',
          },
        }}
        onFocusCapture={() => setFocused(true)}
        onBlurCapture={() => setFocused(false)}
      >
        <TextField
          type="datetime-local"
          label={startLabel}
          size="small"
          variant="standard"
          value={startValue}
          disabled={disabled}
          onChange={(e) => handleStartChange(e.target.value)}
          slotProps={{ input: { disableUnderline: true }, inputLabel: { shrink: true } }}
          sx={{ flex: 1 }}
        />
        <Typography color="text.secondary" sx={{ flexShrink: 0 }}>
          至
        </Typography>
        <TextField
          type="datetime-local"
          label={endLabel}
          size="small"
          variant="standard"
          value={endValue}
          disabled={disabled}
          onChange={(e) => onEndChange(e.target.value)}
          slotProps={{ input: { disableUnderline: true }, inputLabel: { shrink: true } }}
          sx={{ flex: 1 }}
        />
      </Box>
      {helperText && (
        <Typography
          variant="caption"
          color={error ? 'error.main' : 'text.secondary'}
          sx={{ ml: 1.5, mt: 0.5, display: 'block' }}
        >
          {helperText}
        </Typography>
      )}
    </Box>
  );
}
