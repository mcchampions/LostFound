# Getting Started

## 安装

```bash
npm i
npm run build
npm link
```

## 最常用工作流

1. 看模板列表

```bash
postgen template --action list
```

2. 导出示例 JSON

```bash
postgen template --action init --name xhs-note --out ./note.json
# 或：
postgen template --action init --name xhs-quote-blue --out ./quote.json
```

3. 修改 JSON 内容

4. 渲染 PNG

```bash
postgen render --template xhs-note --data ./note.json
# 或：
postgen render --template xhs-quote-blue --data ./quote.json
```

## 默认输出目录

如果不传 `--out`，图片默认输出到：

```bash
./out/
```

## 文件命名

- 默认：`<template>-YYYYMMDD-HHmmss.png`
- 如果传 `--stable-name`：`<template>.png`
