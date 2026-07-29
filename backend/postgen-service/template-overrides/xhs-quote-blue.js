import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { commonSchema } from './schemas.js';
import { resolveTemplateTitleLayout } from './title-engine.js';
export const xhsQuoteBlueTemplate = {
    name: 'xhs-quote-blue',
    description: '浅蓝极简引用风小红书卡片',
    defaultWidth: 1080,
    defaultHeight: 1440,
    examplePath: 'examples/xhs-quote-blue.json',
    schema: commonSchema,
    render: (input) => {
        const titleLayout = input.__resolvedTitleLayout ?? resolveTemplateTitleLayout('xhs-quote-blue', input);
        const titleLines = titleLayout.lines;
        const lineCount = titleLines.length;
        const titleBlockHeight = lineCount * titleLayout.fontSize * titleLayout.lineHeight + Math.max(0, lineCount - 1) * 42;
        const titleTop = Math.max(250, Math.round((1440 - titleBlockHeight) / 2));
        const quoteTop = Math.max(90, titleTop - 190);
        const titleGap = lineCount <= 2 ? 60 : lineCount === 3 ? 52 : 44;
        const highlightWidth = Math.min(Math.max((titleLayout.lineWidths[lineCount - 1] ?? 220) * 0.42, 180), 320);
        return (_jsxs("div", { style: {
                width: '100%',
                height: '100%',
                display: 'flex',
                background: '#D7EAF4',
                color: '#2E3138',
                position: 'relative',
            }, children: [_jsx("div", { style: {
                        position: 'absolute',
                        left: 110,
                        top: quoteTop,
                        display: 'flex',
                        fontSize: 152,
                        lineHeight: 0.9,
                        fontWeight: 900,
                        letterSpacing: -4,
                        color: '#B6D5E6',
                        opacity: 0.95,
                    }, children: "\u201C" }), _jsx("div", { style: {
                        position: 'absolute',
                        left: 118,
                        top: titleTop,
                        width: 760,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: titleGap,
                    }, children: titleLines.map((line, idx) => {
                        const isLast = idx === titleLines.length - 1;
                        return (_jsxs("div", { style: { display: 'flex', position: 'relative', alignItems: 'flex-end' }, children: [isLast ? (_jsx("div", { style: {
                                        position: 'absolute',
                                        left: 2,
                                        bottom: 10,
                                        width: highlightWidth,
                                        height: 46,
                                        background: '#EDB1E5',
                                    } })) : null, _jsx("div", { style: {
                                        display: 'flex',
                                        position: 'relative',
                                        fontSize: titleLayout.fontSize,
                                        lineHeight: titleLayout.lineHeight + (lineCount >= 3 ? 0.04 : 0.02),
                                        letterSpacing: -6,
                                        fontWeight: 900,
                                        color: '#32353B',
                                        whiteSpace: 'nowrap',
                                        flexWrap: 'nowrap',
                                        overflow: 'hidden',
                                        maxWidth: '100%',
                                    }, children: line })] }, idx));
                    }) })] }));
    },
};
//# sourceMappingURL=xhs-quote-blue.js.map