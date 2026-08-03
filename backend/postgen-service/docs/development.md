# Development

## 渲染链路

- `src/cli.ts`：CLI 入口
- `src/render.ts`：统一渲染逻辑
- `src/templates/*`：模板定义与注册

技术栈：
- `Satori`：JSX -> SVG
- `Resvg`：SVG -> PNG
- `zod`：输入校验

## 字体策略

- 中文：优先 `PingFang SC`
- emoji：使用 Twemoji SVG fallback

## 核心契约

长期保持：

```bash
postgen render --template <template> --data <json-file>
```

stdout 只输出最终图片路径，方便脚本调用。

## 开发建议

- 新模板优先复用 `shared.tsx` 里的公共能力
- 避免把太多模板重新堆回一个大文件
- 保持输入 JSON 简洁，不要让字段无节制膨胀
- 构建产物、字体、本地脚本不要默认进 Git
