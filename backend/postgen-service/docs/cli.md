# CLI

## 查看模板列表

```bash
postgen template --action list
postgen template --action list --json
```

## 查看模板详情

```bash
postgen template --action show --name xhs-note
postgen template --action show --name xhs-quote-blue
```

## 输出模板示例 JSON

```bash
postgen template --action init --name xhs-note
postgen template --action init --name xhs-note --out ./note.json
postgen template --action init --name xhs-quote-blue --out ./quote.json
```

## 渲染图片

```bash
postgen render --template xhs-note --data ./note.json
postgen render --template xhs-quote-blue --data ./quote.json
```

### 常用参数

- `--out`：指定输出路径
- `--stable-name`：输出稳定文件名 `<template>.png`
- `--width` / `--height`：覆盖模板默认尺寸
- `--font`：指定常规字体路径
- `--fontBold`：指定粗体字体路径
