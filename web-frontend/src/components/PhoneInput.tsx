import {
  Box, FormControl, InputLabel, MenuItem, Select, TextField, Typography
} from '@mui/material';
import { useTranslation } from 'react-i18next';

interface CountryOption {
  id: string;
  code: string;
  label: string;
  flag?: string;
}

// 国家/地区使用各自母语文字展示，默认中国 +86
const COUNTRIES: CountryOption[] = [
  { id: 'cn', code: '86', label: '中国', flag: '🇨🇳' },
  { id: 'hk', code: '852', label: '中国香港', flag: '🇭🇰' },
  { id: 'mo', code: '853', label: '中国澳门', flag: '🇲🇴' },
  { id: 'tw', code: '886', label: '中国台湾', flag: '🇹🇼' },
  { id: 'us', code: '1', label: 'United States', flag: '🇺🇸' },
  { id: 'ca', code: '1', label: 'Canada', flag: '🇨🇦' },
  { id: 'gb', code: '44', label: 'United Kingdom', flag: '🇬🇧' },
  { id: 'jp', code: '81', label: '日本', flag: '🇯🇵' },
  { id: 'kr', code: '82', label: '대한민국', flag: '🇰🇷' },
  { id: 'sg', code: '65', label: 'Singapore', flag: '🇸🇬' },
  { id: 'my', code: '60', label: 'Malaysia', flag: '🇲🇾' },
  { id: 'th', code: '66', label: 'ไทย', flag: '🇹🇭' },
  { id: 'vn', code: '84', label: 'Việt Nam', flag: '🇻🇳' },
  { id: 'in', code: '91', label: 'India', flag: '🇮🇳' },
  { id: 'au', code: '61', label: 'Australia', flag: '🇦🇺' },
  { id: 'nz', code: '64', label: 'New Zealand', flag: '🇳🇿' },
  { id: 'de', code: '49', label: 'Deutschland', flag: '🇩🇪' },
  { id: 'fr', code: '33', label: 'France', flag: '🇫🇷' },
  { id: 'it', code: '39', label: 'Italia', flag: '🇮🇹' },
  { id: 'es', code: '34', label: 'España', flag: '🇪🇸' },
  { id: 'pt', code: '351', label: 'Portugal', flag: '🇵🇹' },
  { id: 'nl', code: '31', label: 'Nederland', flag: '🇳🇱' },
  { id: 'se', code: '46', label: 'Sverige', flag: '🇸🇪' },
  { id: 'ch', code: '41', label: 'Schweiz', flag: '🇨🇭' },
  { id: 'ru', code: '7', label: 'Россия', flag: '🇷🇺' },
  { id: 'br', code: '55', label: 'Brasil', flag: '🇧🇷' },
  { id: 'mx', code: '52', label: 'México', flag: '🇲🇽' },
  { id: 'id', code: '62', label: 'Indonesia', flag: '🇮🇩' },
  { id: 'ph', code: '63', label: 'Pilipinas', flag: '🇵🇭' },
  { id: 'ae', code: '971', label: 'الإمارات العربية المتحدة', flag: '🇦🇪' },
  { id: 'eg', code: '20', label: 'مصر', flag: '🇪🇬' },
];

const DEFAULT_CODE = '86';

/** 解析存储值（"+86 13800138000" 或旧数据纯数字）为区号 + 号码 */
function parsePhone(value: string): { code: string; number: string } {
  const v = (value || '').trim();
  if (!v) return { code: DEFAULT_CODE, number: '' };
  const match = v.match(/^\+(\d{1,4})\s*(\d+)$/);
  if (match) return { code: match[1], number: match[2] };
  return { code: DEFAULT_CODE, number: v.replace(/\D/g, '') };
}

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  required?: boolean;
  error?: boolean;
  helperText?: string;
  disabled?: boolean;
  size?: 'small' | 'medium';
}

/**
 * 区号（国家/地区母语列表，默认 +86）+ 手机号（纯数字）输入控件。
 * 存储格式："+86 13800138000"；未输入号码时输出空字符串。
 */
export default function PhoneInput({
  value,
  onChange,
  label,
  required = false,
  error = false,
  helperText,
  disabled = false,
  size = 'medium',
}: PhoneInputProps) {
  const { t } = useTranslation();
  const resolvedLabel = label ?? t('phone.label');
  const parsed = parsePhone(value);
  const country = COUNTRIES.find(c => c.code === parsed.code) ?? COUNTRIES[0];
  const number = parsed.number;

  const invalidNumber = number.length > 0 && (number.length < 5 || number.length > 15);
  const showError = error || invalidNumber;
  const shownHelper = invalidNumber ? t('phone.invalid') : helperText;

  const emit = (code: string, digits: string) => {
    onChange(digits ? `+${code} ${digits}` : '');
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
        <FormControl size={size} sx={{ minWidth: 190 }}>
          <InputLabel>{resolvedLabel}</InputLabel>
          <Select
            value={country.id}
            label={resolvedLabel}
            disabled={disabled}
            onChange={(e) => {
              const option = COUNTRIES.find(c => c.id === e.target.value) ?? COUNTRIES[0];
              emit(option.code, number);
            }}
            renderValue={(id) => {
              const option = COUNTRIES.find(c => c.id === id) ?? COUNTRIES[0];
              return (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <span>{option.flag}</span>
                  <span>{option.label}</span>
                  <Typography component="span" variant="body2" color="text.secondary">
                    +{option.code}
                  </Typography>
                </Box>
              );
            }}
          >
            {COUNTRIES.map(option => (
              <MenuItem key={option.id} value={option.id}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <span>{option.flag}</span>
                  <span>{option.label}</span>
                  <Typography component="span" variant="body2" color="text.secondary">
                    +{option.code}
                  </Typography>
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          fullWidth
          size={size}
          label={t('phone.number')}
          value={number}
          disabled={disabled}
          onChange={(e) => emit(country.code, e.target.value.replace(/\D/g, ''))}
          error={showError}
          helperText={shownHelper}
          slotProps={{
            htmlInput: { maxLength: 15, inputMode: 'numeric' },
          }}
        />
      </Box>
      {required && !number && (
        <Typography variant="caption" color="error.main" sx={{ ml: 1.5, mt: 0.5, display: 'block' }}>
          {t('phone.required')}
        </Typography>
      )}
    </Box>
  );
}
