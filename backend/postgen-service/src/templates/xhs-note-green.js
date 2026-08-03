import { jsx as _jsx, jsxs as _jsxs } from 'react/jsx-runtime';
import { commonSchema } from './schemas.js';
import { resolveTemplateTitleLayout } from './title-engine.js';

const greenTheme = {
  canvasBg: '#2EBA77',
  cardBg: '#F1F1F1',
  borderColor: '#2D6E54',
  shadowColor: '#008B48',
  titleColor: '#000000',
  subtitleColor: 'rgba(17,17,17,0.68)',
  highlightBarColor: '#F4A0D2',
  dividerColor: '#4A8D71',
  labelColor: '#118455',
};

export const xhsNoteGreenTemplate = {
  name: 'xhs-note-green',
  description: 'Xiaohongshu green note card with visible subtitle',
  defaultWidth: 1080,
  defaultHeight: 1440,
  examplePath: 'examples/xhs-note-green.json',
  schema: commonSchema,
  render: (input) => {
    const titleLayout = input.__resolvedTitleLayout
      ?? resolveTemplateTitleLayout('xhs-note-green', input);
    const titleLines = titleLayout.lines;
    const subtitle = String(input.subtitle ?? '').trim();
    const noteLabel = input.label ?? 'Text Note';
    const weekday = input.day ?? 'Wednesday';
    const theme = greenTheme;

    return _jsx('div', {
      style: {
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        padding: 54,
        background: theme.canvasBg,
        color: theme.titleColor,
      },
      children: _jsx('div', {
        style: { display: 'flex', width: '100%', height: '100%' },
        children: _jsx('div', {
          style: { flex: 1, display: 'flex' },
          children: _jsx('div', {
            style: {
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'stretch',
            },
            children: _jsxs('div', {
              style: {
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                borderRadius: 48,
                background: theme.cardBg,
                border: `4px solid ${theme.borderColor}`,
                boxShadow: `12px 14px 0 ${theme.shadowColor}`,
                padding: '76px 76px 56px 76px',
              },
              children: [
                _jsx('div', {
                  style: { flex: 1, display: 'flex', alignItems: 'center' },
                  children: _jsxs('div', {
                    style: {
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 22,
                      maxWidth: 760,
                    },
                    children: [
                      titleLines.map((line, idx) => {
                        const trimmed = line.trim();
                        const isHighlight = idx === titleLines.length - 1;
                        return _jsxs('div', {
                          style: {
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'flex-start',
                          },
                          children: [
                            _jsx('div', {
                              style: {
                                display: 'flex',
                                fontSize: titleLayout.fontSize,
                                fontWeight: 900,
                                letterSpacing: -2.2,
                                lineHeight: titleLayout.lineHeight,
                                whiteSpace: 'nowrap',
                                flexWrap: 'nowrap',
                                maxWidth: '100%',
                              },
                              children: trimmed,
                            }),
                            isHighlight ? _jsx('div', {
                              style: {
                                display: 'flex',
                                width: 330,
                                height: 14,
                                marginTop: -8,
                                marginLeft: 2,
                                background: theme.highlightBarColor,
                                borderRadius: 2,
                              },
                            }) : null,
                          ],
                        }, idx);
                      }),
                      subtitle ? _jsx('div', {
                        style: {
                          display: 'flex',
                          flexDirection: 'column',
                          width: 760,
                          maxHeight: 430,
                          overflow: 'hidden',
                          marginTop: 34,
                          fontSize: 46,
                          lineHeight: 1.42,
                          fontWeight: 400,
                          color: theme.subtitleColor,
                        },
                        children: subtitle.split('\n').map((line, i) =>
                          _jsx('div', {
                            style: { whiteSpace: 'nowrap' },
                            children: line,
                          }, i)
                        ),
                      }) : null,
                    ],
                  }),
                }),
                _jsxs('div', {
                  style: { display: 'flex', flexDirection: 'column', gap: 20 },
                  children: [
                    _jsx('div', {
                      style: {
                        width: '100%',
                        height: 2,
                        background: theme.dividerColor,
                      },
                    }),
                    _jsxs('div', {
                      style: {
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      },
                      children: [
                        _jsx('div', {
                          style: {
                            display: 'flex',
                            fontSize: 24,
                            fontWeight: 800,
                            color: theme.labelColor,
                          },
                          children: weekday,
                        }),
                        _jsx('div', {
                          style: {
                            display: 'flex',
                            fontSize: 24,
                            fontWeight: 800,
                            color: theme.labelColor,
                          },
                          children: noteLabel,
                        }),
                      ],
                    }),
                  ],
                }),
              ],
            }),
          }),
        }),
      }),
    });
  },
};
