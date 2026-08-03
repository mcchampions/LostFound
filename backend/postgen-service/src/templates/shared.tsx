import type { ReactNode } from 'react';

export function clamp(text: string, max = 60) {
  const t = (text ?? '').trim();
  return t.length > max ? t.slice(0, max - 1) + '…' : t;
}

export function renderHugeTitle(text: string, charsPerLine = 9) {
  const clean = (text ?? '').trim();
  if (!clean) return [''];

  const manualLines = clean
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (manualLines.length > 1) {
    return manualLines.slice(0, 6);
  }

  const tokens = clean.split(/\s+/).filter(Boolean);
  if (tokens.length > 1) {
    const lines: string[] = [];
    let current = '';

    for (const token of tokens) {
      const next = current ? `${current} ${token}` : token;
      if (next.length <= charsPerLine || !current) {
        current = next;
      } else {
        lines.push(current);
        current = token;
      }
    }

    if (current) lines.push(current);
    return lines.slice(0, 6);
  }

  const lines: string[] = [];
  for (let i = 0; i < clean.length; i += charsPerLine) {
    lines.push(clean.slice(i, i + charsPerLine));
  }
  return lines.slice(0, 6);
}


export const themes = {
  black: { bg: '#0B0F14', fg: '#F3F6FA', accent: '#7DD3FC', muted: 'rgba(243,246,250,0.72)' },
  white: { bg: '#FFFFFF', fg: '#0B0F14', accent: '#2563EB', muted: 'rgba(11,15,20,0.60)' },
  yellow: { bg: '#FFEB3B', fg: '#111827', accent: '#111827', muted: 'rgba(17,24,39,0.70)' },
  mint: { bg: '#D1FAE5', fg: '#064E3B', accent: '#065F46', muted: 'rgba(6,78,59,0.70)' },
} as const;

export function baseContainer(bg: string, fg: string): Record<string, string | number> {
  return {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    padding: 84,
    color: fg,
    fontSize: 48,
    lineHeight: 1.15,
    background: bg,
  };
}

export function wrap(content: ReactNode, bg: string) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        background: bg,
      }}
    >
      {content}
    </div>
  );
}
