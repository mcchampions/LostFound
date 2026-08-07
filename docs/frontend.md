# 前端

## 技术栈与构建

React 19 + TypeScript + Vite 8 + MUI 9 + axios + i18next + 原生 EventSource。
构建：`yarn build`（`tsc -b && vite build`），路由按页面懒加载分包。

## 目录结构

```
web-frontend/src/
├── api/          # 接口封装（client/auth/admin/categories/chat/claims/cover/
│                 # foundItems/lostItems/notifications/upload）
├── components/   # Layout/ProtectedRoute/ImageCropDialog/ItemImageUpload/
│                 # TextCoverDialog/DateTimeRangePicker/PhoneInput
├── pages/        # 21 个页面（含 admin/ 子目录）
├── store/        # AuthContext / ChatSseContext
├── i18n/         # 中文本地化（zh-CN）
├── App.tsx       # Provider 组装
├── router.tsx    # 路由表（懒加载）
└── config.ts     # 后端地址/SSE 地址/资源地址
```

## 路由（21 页）

| 路径 | 页面 | 权限 |
|---|---|---|
| `/` | Home | 公开 |
| `/login` `/register` `/forgot-password` | 认证 | 公开 |
| `/lost-items` `/found-items`（含 `/:id`） | 列表/详情 | 公开 |
| `/lost-items/create` `/found-items/create`（含 `/edit`） | 表单 | 登录 |
| `/notifications` `/claims` `/chat` `/profile` | 个人区 | 登录 |
| `/users/:id` | 公开主页 | 公开 |
| `/admin/*` | 管理后台 | ADMIN |
| `/login/admin` | 管理员登录 | 公开 |

## 全局状态

- `AuthContext`：登录态、HttpOnly Cookie 会话、401 自动登出；JWT 不写入 `localStorage`；
- `ChatSseContext`：登录即建立 EventSource，接收 `message` 与 `notification`
  事件；维护 `unreadTotal`（对话未读）与 `notificationUnread`（通知未读），
  驱动侧边栏「对话」红点与顶栏铃铛角标；登出时归零。

## 关键交互

- **聊天**：默认加载最近 50 条，「查看更早消息」向前翻页；当前会话新消息实时
  追加并自动已读，其他会话消息点亮红点；认领通过提示居中显示为旁白；
- **个人主页**：可直接向其他用户发起聊天，未登录时转到登录页；
- **时间范围**：`DateTimeRangePicker`（开始~结束，不能晚于当前时间，结束不得
  早于开始，实时标红）；
- **手机号**：`PhoneInput`（国家/地区母语列表 +86 默认，号码纯数字校验）；
- **文字封面**：`TextCoverDialog` 预览后使用，时间格式化为无 `T` 的可读形式；
- **图片**：上传 → 裁剪 → 多图管理。

## 通知与角标

- 通知通过 SSE `notification` 事件实时推送，铃铛角标即时
  +1；回到前台时兜底刷新未读数；
- 已读/全部已读后立即刷新角标。
