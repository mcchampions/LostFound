import type { TemplateDefinition } from './types.js';
import { commonSchema } from './schemas.js';
import { resolveTemplateTitleLayout } from './title-engine.js';

const PAGE_BG = '#F9F9F7';
const RULE_COLOR = 'rgba(0, 0, 0, 0.07)';
const HEADER_GOLD = '#D3AC26';
const TEXT_COLOR = '#3A3A3A';

function AppleBackIcon() {
  return (
    <svg width="26" height="42" viewBox="0 0 26 42" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M18 6L8 21L18 36" stroke={HEADER_GOLD} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function AppleShareIcon() {
  return (
    <svg width="34" height="38" viewBox="0 0 34 38" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17 4V22" stroke={HEADER_GOLD} strokeWidth="3.5" strokeLinecap="round" />
      <path d="M10 11L17 4L24 11" stroke={HEADER_GOLD} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 16.5H26C27.3807 16.5 28.5 17.6193 28.5 19V31C28.5 32.3807 27.3807 33.5 26 33.5H8C6.61929 33.5 5.5 32.3807 5.5 31V19C5.5 17.6193 6.61929 16.5 8 16.5Z" stroke={HEADER_GOLD} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function AppleMoreIcon() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, height: 38 }}>
      {[0, 1, 2].map((idx) => (
        <div key={idx} style={{ width: 6, height: 6, borderRadius: 999, background: HEADER_GOLD }} />
      ))}
    </div>
  );
}

export const appleNotesHandwriteTemplate: TemplateDefinition = {
  name: 'apple-notes-handwrite',
  description: 'Apple Notes 手写便签风格模板',
  defaultWidth: 1080,
  defaultHeight: 1440,
  examplePath: 'examples/apple-notes-handwrite.json',
  preferredFontRegularPath: 'fonts/custom/PatrickHand-Regular.ttf',
  schema: commonSchema,
  render: (input) => {
    const titleLayout = input.__resolvedTitleLayout ?? resolveTemplateTitleLayout('apple-notes-handwrite', input);
    const titleLines = titleLayout.lines;
    const lineHeightPx = 116;
    const topOffset = 486;
    const leftPadding = 92;
    const emoji = input.icon?.trim();

    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          position: 'relative' as any,
          overflow: 'hidden',
          background: PAGE_BG,
        }}
      >
        {Array.from({ length: 18 }).map((_, idx) => (
          <div
            key={idx}
            style={{
              position: 'absolute' as any,
              left: 54,
              right: 54,
              top: 138 + idx * 78,
              height: 3,
              background: RULE_COLOR,
            }}
          />
        ))}

        <div
          style={{
            position: 'absolute' as any,
            left: 44,
            top: 52,
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            color: HEADER_GOLD,
            fontSize: 34,
            fontWeight: 500,
          }}
        >
          <AppleBackIcon />
          <div>Notes</div>
        </div>

        <div
          style={{
            position: 'absolute' as any,
            right: 42,
            top: 50,
            display: 'flex',
            alignItems: 'center',
            gap: 34,
            color: HEADER_GOLD,
          }}
        >
          <AppleShareIcon />
          <AppleMoreIcon />
        </div>

        <div
          style={{
            position: 'absolute' as any,
            left: leftPadding,
            top: topOffset,
            width: 860,
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          {titleLines.map((line, idx) => (
            <div
              key={idx}
              style={{
                height: lineHeightPx,
                display: 'flex',
                alignItems: 'flex-end',
                fontSize: titleLayout.fontSize,
                lineHeight: titleLayout.lineHeight,
                letterSpacing: -0.9,
                color: TEXT_COLOR,
                fontWeight: 500,
                transform: 'rotate(-1.2deg)',
                transformOrigin: 'left bottom',
                whiteSpace: 'nowrap',
              }}
            >
              {line}
              {idx === titleLines.length - 1 && emoji ? <span style={{ marginLeft: 10, fontSize: titleLayout.fontSize * 0.8 }}>{emoji}</span> : null}
            </div>
          ))}
        </div>
      </div>
    );
  },
};
