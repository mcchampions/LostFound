import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { commonSchema } from './schemas.js';
import { resolveTemplateTitleLayout } from './title-engine.js';
export const xhsNoteGreenTemplate = {
    name: 'xhs-note-green',
    description: '绿色小红书 note 卡片',
    defaultWidth: 1080,
    defaultHeight: 1440,
    examplePath: 'examples/xhs-note-green.json',
    schema: commonSchema,
    render: (input) => {
        const titleLayout = input.__resolvedTitleLayout ?? resolveTemplateTitleLayout('xhs-note-green', input);
        const titleLines = titleLayout.lines;
        const noteLabel = input.label ?? 'Text Note';
        const weekday = input.day ?? 'Wednesday';
        return (_jsx("div", { style: { width: '100%', height: '100%', display: 'flex', flexDirection: 'column', padding: 54, background: '#2EBA77', color: '#000000' }, children: _jsx("div", { style: { display: 'flex', width: '100%', height: '100%' }, children: _jsx("div", { style: { flex: 1, display: 'flex' }, children: _jsx("div", { style: { width: '100%', height: '100%', display: 'flex', flexDirection: 'row', alignItems: 'stretch' }, children: _jsxs("div", { style: {
                                flex: 1,
                                display: 'flex',
                                flexDirection: 'column',
                                borderRadius: 48,
                                background: '#F1F1F1',
                                border: '4px solid #2D6E54',
                                boxShadow: '12px 14px 0 #008B48',
                                padding: '76px 76px 56px 76px',
                            }, children: [_jsx("div", { style: { flex: 1, display: 'flex', alignItems: 'center' }, children: _jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: 22, maxWidth: 760 }, children: titleLines.map((line, idx) => {
                                            const trimmed = line.trim();
                                            const isHighlight = idx === titleLines.length - 1;
                                            return (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }, children: [_jsx("div", { style: { display: 'flex', fontSize: titleLayout.fontSize, fontWeight: 900, letterSpacing: -2.2, lineHeight: titleLayout.lineHeight, whiteSpace: 'nowrap', flexWrap: 'nowrap', maxWidth: '100%' }, children: trimmed }), isHighlight ? (_jsx("div", { style: {
                                                            display: 'flex',
                                                            width: 330,
                                                            height: 14,
                                                            marginTop: -8,
                                                            marginLeft: 2,
                                                            background: '#F4A0D2',
                                                            borderRadius: 2,
                                                        } })) : null] }, idx));
                                        }) }) }), _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 20 }, children: [_jsx("div", { style: { width: '100%', height: 2, background: '#4A8D71' } }), _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsx("div", { style: { display: 'flex', fontSize: 24, fontWeight: 800, color: '#118455' }, children: weekday }), _jsx("div", { style: { display: 'flex', fontSize: 24, fontWeight: 800, color: '#118455' }, children: noteLabel })] })] })] }) }) }) }) }));
    },
};
//# sourceMappingURL=xhs-note-green.js.map