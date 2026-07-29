import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from 'react/jsx-runtime';
import { commonSchema } from './schemas.js';
import { resolveTemplateTitleLayout } from './title-engine.js';

const xhsNoteThemes = {
  cream: {
    canvasBg: '#F4B138',
    backCardBg: '#EAD7AF',
    frontCardBg: '#F3F1EB',
    accent: '#E0B54B',
    titleColor: '#111111',
    subtitleColor: 'rgba(17,17,17,0.68)',
    dividerColor: '#D9C15A',
    topDotsMarginLeft: 24,
    iconMarginLeft: 18,
    titleMarginLeft: 14,
  },
  blue: {
    canvasBg: '#169AED',
    backCardBg: 'rgba(230, 242, 250, 0.72)',
    frontCardBg: '#EEF1F3',
    accent: '#2A9FE8',
    titleColor: '#000000',
    subtitleColor: 'rgba(17,17,17,0.66)',
    dividerColor: '#5DB8BB',
    topDotsMarginLeft: 24,
    iconMarginLeft: 18,
    titleMarginLeft: 14,
  },
};

export const xhsNoteTemplate = {
  name: 'xhs-note',
  description: 'Xiaohongshu Text Note card with visible subtitle',
  defaultWidth: 1080,
  defaultHeight: 1440,
  examplePath: 'examples/xhs-note.json',
  schema: commonSchema,
  render: (input) => {
    const titleLayout = input.__resolvedTitleLayout
      ?? resolveTemplateTitleLayout('xhs-note', input);
    const titleLines = titleLayout.lines;
    const subtitle = String(input.subtitle ?? '').trim();
    const noteLabel = input.label ?? 'Text Note';
    const icon = input.icon ?? '💻';
    const variant = input.theme === 'blue' ? 'blue' : 'cream';
    const theme = xhsNoteThemes[variant];
    const hasWrappedTitle = titleLines.length > 1;
    const titleGap = titleLines.length >= 3 ? 50 : hasWrappedTitle ? 40 : 24;

    return _jsxs('div', {
      style: {
        width: '100%',
        height: '100%',
        display: 'flex',
        background: theme.canvasBg,
        position: 'relative',
        overflow: 'hidden',
      },
      children: [
        _jsx('div', {
          style: {
            position: 'absolute',
            left: 98,
            top: 62,
            width: 884,
            height: 1246,
            display: 'flex',
          },
          children: _jsx('div', {
            style: {
              position: 'absolute',
              left: 0,
              top: 0,
              width: 884,
              height: 1246,
              borderRadius: 52,
              background: theme.backCardBg,
              transform: 'rotate(3.3deg)',
              transformOrigin: '50% 50%',
              boxShadow: '0 30px 80px rgba(0,0,0,0.14)',
            },
          }),
        }),
        _jsxs('div', {
          style: {
            position: 'absolute',
            left: 98,
            top: 62,
            width: 884,
            height: 1246,
            display: 'flex',
            flexDirection: 'column',
            borderRadius: 52,
            background: theme.frontCardBg,
            boxShadow: '0 24px 72px rgba(0,0,0,0.16)',
            padding: '70px 54px 46px 54px',
          },
          children: [
            _jsxs('div', {
              style: {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              },
              children: [
                _jsx('div', {
                  style: { display: 'flex', gap: 12, marginLeft: theme.topDotsMarginLeft },
                  children: [0, 1, 2].map((index) => _jsx('div', {
                    style: {
                      width: 10,
                      height: 10,
                      borderRadius: 99,
                      background: theme.accent,
                    },
                  }, index)),
                }),
                _jsx('div', {
                  style: {
                    fontSize: 24,
                    fontWeight: 800,
                    color: theme.accent,
                    letterSpacing: -0.5,
                    marginRight: 20,
                  },
                  children: noteLabel,
                }),
              ],
            }),
            _jsxs('div', {
              style: { display: 'flex', flexDirection: 'column', marginTop: 104 },
              children: [
                _jsx('div', {
                  style: {
                    fontSize: 96,
                    lineHeight: 1,
                    marginLeft: theme.iconMarginLeft,
                    marginBottom: 42,
                  },
                  children: icon,
                }),
                _jsx('div', {
                  style: {
                    display: 'flex',
                    flexDirection: 'column',
                    gap: titleGap,
                    marginLeft: theme.titleMarginLeft,
                    maxWidth: 760,
                  },
                  children: titleLines.map((line, index) => {
                    const highlight = index === 0
                      ? Math.min(2, Math.max(1, Math.floor(line.length / 2))) : 0;
                    const before = highlight ? line.slice(0, highlight) : line;
                    const after = highlight ? line.slice(highlight) : '';
                    const highlightBg = variant === 'blue' ? '#F0DE54' : '#E9D44B';
                    return _jsx('div', {
                      style: {
                        display: 'flex',
                        alignItems: 'flex-end',
                        flexWrap: 'nowrap',
                        whiteSpace: 'nowrap',
                        fontSize: titleLayout.fontSize,
                        lineHeight: titleLayout.lineHeight,
                        letterSpacing: -3.5,
                        fontWeight: 900,
                        color: theme.titleColor,
                        maxWidth: '100%',
                      },
                      children: index === 0 && highlight
                        ? _jsxs(_Fragment, {
                          children: [
                            _jsx('span', {
                              style: {
                                background: highlightBg,
                                borderRadius: 12,
                                padding: '0 8px 2px 8px',
                                marginRight: 4,
                              },
                              children: before,
                            }),
                            _jsx('span', { children: after }),
                          ],
                        })
                        : _jsx('span', { children: line }),
                    }, index);
                  }),
                }),
                subtitle ? _jsx('div', {
                  style: {
                    display: 'flex',
                    width: 760,
                    maxHeight: 430,
                    overflow: 'hidden',
                    marginTop: 34,
                    marginLeft: theme.titleMarginLeft,
                    fontSize: 46,
                    lineHeight: 1.42,
                    fontWeight: 400,
                    color: theme.subtitleColor,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  },
                  children: subtitle,
                }) : null,
              ],
            }),
            _jsx('div', { style: { flex: 1, display: 'flex' } }),
            _jsx('div', {
              style: {
                display: 'flex',
                flexDirection: 'column',
                gap: 22,
                padding: '0 18px 0 18px',
              },
              children: _jsx('div', {
                style: {
                  width: '100%',
                  height: 2,
                  background: theme.dividerColor,
                  borderRadius: 99,
                },
              }),
            }),
          ],
        }),
      ],
    });
  },
};
