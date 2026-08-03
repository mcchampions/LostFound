# postgen-service - 文字封面生成服务

后端边车服务:把纯文字渲染成封面图(1080x1440 模板 → 1280x720 横版合成),
供失物/招领封面使用。本目录就是 `postgen2` 0.0.4 的修改版源码
(satori + resvg-js)+ sharp 实现。

## 运行

### 独立运行(Node)

```bash
npm install           # 安装依赖并自动构建 dist/（prepare 钩子）
npm run build         # 若跳过 prepare，可手动构建
node server.js        # 默认监听 :3000
```

环境变量:

| 变量 | 默认 | 说明 |
|---|---|---|
| `PORT` | `3000` | HTTP 端口 |
| `WORK_DIR` | `/tmp/postgen-work` | 临时渲染目录 |

### 随后端启动（jar 部署）

`backend/start-app*.bat|sh`（及 `backend/app/start*.bat|sh`）会先启动本服务
再启动后端，后端退出时自动停止；后端通过 `POSTGEN_BASE_URL`
（默认 `http://localhost:3000`）调用。

## 模板源码（本目录即 postgen2 修改版）

本目录就是 postgen2 0.0.4 的修改版源码：`src/`（含 `src/templates/`）、`dist/`、
`fonts/`、`examples/` 等直接放在这里，不存在独立的 postgen2 包。四个模板
`xhs-note`、`xhs-note-green`、`xhs-quote-blue`、`xhs-date-note` 的源码在
`src/templates/` 下，负责标题之外的正文（subtitle）渲染；registry、schema 与
example JSON 一并维护在本目录中。

- 修改模板：直接改 `src/templates/` 下对应文件；
- 重新构建：本目录执行 `npm install`（prepare 自动构建）或 `npm run build`，
  产物输出到 `dist/`；
- `server.js` 直接引用本目录的 `dist/`，不再覆盖任何 node_modules 文件；
- 新增模板按 postgen2 规范补全：新建模板文件、注册到
  `src/templates/registry.tsx`、提供 example JSON、确认 schema 能校验输入。

## HTTP API

`POST /render`,请求体 JSON(≤64KB):

```json
{
  "title": "标题(必填)",
  "content": "正文(可选,最多 144 字)",
  "category": "分类",
  "location": "地点",
  "date": "日期(由前端格式化)",
  "template": "xhs-note"
}
```

成功返回 `image/png`;参数/模板非法返回 400,渲染失败返回 500。

### 模板

- 模板:`xhs-note`(经典笔记)、`xhs-note-green`(绿色笔记)、
  `xhs-quote-blue`(蓝色引用)、`xhs-date-note`(日期手写);
配色由模板固定,不再支持 `theme` 参数。

## 与后端集成

后端 `app.postgen.enabled` / `base-url` / `rate-limit-per-minute` 控制开关、
地址与限流;jar 直跑模式需自行启动本服务,否则封面生成会报错。

## 排版说明

- 原生模板按 1080x1440 渲染作为左侧视觉,右侧 520px 补充信息区(类别/地点/
  日期);
- 标题:无手动换行时**原样透传**,由 postgen2 原生引擎自动折行与缩放字号
  (原生行为保持不变);只有手动回车换行的超宽行才用真实字体字形宽度
  (@shuding/opentype.js)重新折行并截断;
- 正文:按 46px 字号、760px 宽度用真实字宽折行,除蓝色引用外统一 6 行;
  蓝色引用按几何计算(标题 1/2/3 行 → 5/4/4 行);超出时逐字回退删除字符并
  以省略号结尾(省略号宽度一并计入);
- 标题最多 3 行:常规长度(引擎布局 ≤3 行)原样透传;超长标题从容量上限
  (经典/日期 39 字、蓝色 48 字,含省略号;绿色引擎实测 38 字)逐字回退,
  直到 postgen2 引擎最终布局不超过 3 行,末尾以省略号结尾;
- 标题换行模式 `rule`,字体内置(LXGW WenKai / Marker Gothic)。
