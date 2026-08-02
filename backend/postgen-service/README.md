# postgen-service - 文字封面生成服务

后端边车服务:把纯文字渲染成封面图(1080x1440 模板 → 1280x720 横版合成),
供失物/招领封面使用。基于 `postgen2`(satori + resvg-js)+ sharp 实现。

## 运行

### 独立运行(Node)

```bash
npm install
node server.js        # 默认监听 :3000
```

环境变量:

| 变量 | 默认 | 说明 |
|---|---|---|
| `PORT` | `3000` | HTTP 端口 |
| `WORK_DIR` | `/tmp/postgen-work` | 临时渲染目录 |

### Docker

随 `backend/docker-compose.yml` 的 `postgen` 服务启动,仅容器内部访问,
后端通过 `POSTGEN_BASE_URL`(如 `http://postgen:3000`)调用。

## HTTP API

`POST /render`,请求体 JSON(≤64KB):

```json
{
  "title": "标题(必填)",
  "content": "正文(可选,最多 144 字)",
  "category": "分类",
  "location": "地点",
  "date": "日期(由前端格式化)",
  "template": "xhs-note",
  "theme": "cream"
}
```

成功返回 `image/png`;参数/模板/主题非法返回 400,渲染失败返回 500。

### 模板与主题

- 模板:`xhs-note`(经典笔记)、`xhs-note-green`(绿色笔记)、
  `xhs-quote-blue`(蓝色引用)、`xhs-date-note`(日期手写);
- 主题:`cream`、`blue`、`green`。

## 与后端集成

后端 `app.postgen.enabled` / `base-url` / `rate-limit-per-minute` 控制开关、
地址与限流;jar 直跑模式需自行启动本服务,否则封面生成会报错。

## 排版说明

- 原生模板按 1080x1440 渲染作为左侧视觉,右侧 520px 补充信息区(类别/地点/
  日期);
- 正文在标题下方白底框内渲染,超 144 字符截断并加省略号;
- 标题换行模式 `rule`,字体内置(LXGW WenKai / Marker Gothic)。
