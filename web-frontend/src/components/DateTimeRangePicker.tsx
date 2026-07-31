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

const pad2 = (n: number) => String(n).padStart(2, '0');

/** 把 Date 格式化为 datetime-local 用的 "YYYY-MM-DDTHH:mm" 本地时间字符串 */
export const formatLocalDateTime = (d: Date) =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;

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

  const nowLocal = formatLocalDateTime(new Date());
  // 实时校验：结束时间早于开始时间时立即标红，无需等提交
  const invalidRange = Boolean(startValue && endValue && endValue < startValue);
  // 实时校验：开始或结束时间晚于当前时间时标红（不能预知未来）
  const futureInvalid = Boolean(
    (startValue && startValue > nowLocal) || (endValue && endValue > nowLocal)
  );
  const showError = error || invalidRange || futureInvalid;
  const shownHelper = invalidRange
    ? '结束时间不能早于开始时间'
    : futureInvalid
      ? '时间不能晚于当前时间'
      : helperText;
  // 开始时间的可选上限：取「结束时间」与「当前时间」中更早的那个
  const startMax = endValue && endValue < nowLocal ? endValue : nowLocal;

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
          color: showError ? 'error.main' : focused ? 'primary.main' : 'text.secondary',
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
          borderColor: showError ? 'error.main' : focused ? 'primary.main' : 'divider',
          bgcolor: disabled ? 'action.hover' : 'background.paper',
          transition: 'border-color 120ms ease',
          '&:hover': {
            borderColor: showError ? 'error.main' : focused ? 'primary.main' : 'text.primary',
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
          slotProps={{
            input: { disableUnderline: true },
            inputLabel: { shrink: true },
            htmlInput: { max: startMax },
          }}
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
          slotProps={{
            input: { disableUnderline: true },
            inputLabel: { shrink: true },
            htmlInput: { min: startValue || undefined, max: nowLocal },
          }}
          sx={{ flex: 1 }}
        />
      </Box>
      {shownHelper && (
        <Typography
          variant="caption"
          color={showError ? 'error.main' : 'text.secondary'}
          sx={{ ml: 1.5, mt: 0.5, display: 'block' }}
        >
          {shownHelper}
        </Typography>
      )}
    </Box>
  );
}
