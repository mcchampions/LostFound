5# 校园失物招领 - 前端

基于 React 的校园失物招领前端,与 `backend/` 后端独立部署,可不在同一台机器。

## 技术栈

- React 19 + TypeScript · Vite 8 · MUI 9
- axios · react-router-dom 7 · i18next · @stomp/stompjs + SockJS
- 代码检查:oxlint;构建:`tsc -b && vite build`

## 目录结构

```
web-frontend/src/
├── api/          # 接口封装(client/auth/admin/categories/chat/claims/cover/
│                 # foundItems/lostItems/notifications/upload)
├── components/   # Layout/ProtectedRoute/ImageCropDialog/ItemImageUpload/
│                 # TextCoverDialog/DateTimeRangePicker/PhoneInput
├── pages/        # 21 个页面(含 admin/ 子目录)
├── store/        # AuthContext / ChatSocketContext
├── i18n/         # zh-CN 本地化
├── router.tsx    # 路由表(懒加载分包)
└── config.ts     # 后端地址/WS 地址/资源地址
```

## 开发

```bash
yarn install
yarn dev          # http://localhost:5173
```

后端地址默认 `http://localhost:8080`(见 `src/config.ts`),可用环境变量
`VITE_SERVER_BASE` 覆盖。

## 构建与部署

```bash
yarn build        # 产物在 dist/,路由按页面分包
```

Docker 部署默认**同源反代**(前后端分机部署,前端机 Nginx 反代到后端机):

- `VITE_SERVER_BASE` 留空 → 浏览器经本 Nginx 访问 `/api`、`/uploads`、`/ws`;
- `BACKEND_UPSTREAM`(必改) 指定 Nginx 反代的后端机地址,如
  `http://192.168.1.10:8080`,不能填只在后端机内部可解析的容器名。

```bash
docker compose up -d --build
```

Nginx 配置见 `nginx.conf`(SPA 路由回退 + `/api`、`/uploads`、`/ws` 反代,透传
`X-Forwarded-For` 供后端还原真实客户端 IP)。

## 关键能力

- **全局 WebSocket**:登录后即建立连接(`/ws`,STOMP),任意页面实时接收消息与
  通知;侧边栏「对话」红点、顶栏铃铛角标实时更新;
- **聊天**:默认加载最近 50 条,「查看更早消息」向前翻页;当前会话消息实时
  追加并自动已读;
- **时间范围**:开始~结束选择,结束不得早于开始、不得晚于当前时间,实时标红;
- **手机号**:国家/地区母语列表(默认 +86),号码纯数字校验;
- **文字封面**:预览后使用,时间格式化无 `T`。

## 相关文档

- 完整项目文档:`docs/`(架构/API/前端/部署)
