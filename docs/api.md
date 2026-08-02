# API 参考

## 通用约定

- 前缀：`/api/v1`；
- 认证：`Authorization: Bearer <token>`；
- 统一响应：`{"code": 0, "message": "success", "data": ...}`，非 0 为错误；
- 分页响应：`PageResult {records, total, current, size}`；
- 公开接口：认证、分类/公告读取、失物/招领列表与详情、公开主页、上传文件。

## 认证 `/auth`

| 方法 | 路径 | 说明 | 权限 |
|---|---|---|---|
| POST | `/auth/register` | 注册（STUDENT 直接激活，TEACHER 待审核） | 公开 |
| POST | `/auth/login` | 登录 | 公开 |
| POST | `/auth/admin-login` | 管理员登录 | 公开 |
| POST | `/auth/refresh` | 刷新令牌 | 登录 |
| POST | `/auth/forgot-password` | 发送重置密码验证码 | 公开 |
| POST | `/auth/reset-password` | 校验验证码并重置密码 | 公开 |

## 用户 `/users`

| 方法 | 路径 | 说明 |
|---|---|---|
| GET/PUT | `/users/me` | 获取/更新个人资料 |
| PUT | `/users/me/password` | 修改密码（旧 token 失效） |
| GET | `/users/search?q=` | 搜索用户（最多 10 条） |
| POST | `/users/me/send-verify-code` | 发送邮箱验证码 |
| POST | `/users/me/verify-email` | 校验邮箱验证码 |
| GET/PUT | `/users/me/email-preferences` | 邮件偏好（按类型开关） |
| GET | `/users/{id}/public-profile` | 公开主页信息 |
| GET | `/users/{id}/items` | 公开主页发布/解决列表 |

## 失物/招领

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/lost-items` `/found-items` | 列表（keyword/categoryId/status 分页） |
| GET | `/lost-items/{id}` `/found-items/{id}` | 详情 |
| POST | `/lost-items` `/found-items` | 发布（登录） |
| PUT | `/lost-items/{id}` `/found-items/{id}` | 编辑（仅发布者） |
| DELETE | `/lost-items/{id}` `/found-items/{id}` | 删除（有申请记录时禁止；联动清理图片） |
| PUT | `/lost-items/{id}/status` `/found-items/{id}/status` | 状态/解决信息（时间范围校验、解决后压缩图片） |

## 认领 `/claims`

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/claims` | 提交认领申请（防重复，不能认领自己的） |
| GET | `/claims/received` | 我收到的申请（status 过滤） |
| GET | `/claims/sent` | 我发出的申请 |
| PUT | `/claims/{id}` | 处理：`{status: APPROVED\|REJECTED}`（通过联动物品终态/会话/通知） |

## 通知 `/notifications`

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/notifications` | 分页列表 |
| PUT | `/notifications/{id}/read` | 单条已读 |
| PUT | `/notifications/read-all` | 全部已读 |
| GET | `/notifications/unread-count` | 未读数 |

## 公告/分类/上传/封面

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/announcements` | 公告列表（公开） |
| POST/PUT/DELETE | `/admin/announcements` | 管理（登录+ADMIN） |
| GET | `/categories` | 分类列表（公开） |
| POST/PUT/DELETE | `/admin/categories` | 分类管理（ADMIN） |
| POST | `/upload/image` | 图片上传（5MB 内、压缩 1080P、UUID 文件名） |
| GET | `/uploads/**` | 静态文件（缺失返回占位图） |
| POST | `/cover/generate` | 文字封面生成（登录、限流） |

## 聊天 `/chat`（REST 部分）

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/chat/start/{targetUserId}` | 获取/创建会话 ID |
| POST | `/chat/send` | 发送消息（在线推送，离线收集摘要） |
| GET | `/chat/conversations` | 会话列表（按人合并未读） |
| GET | `/chat/messages/{conversationId}` | 消息分页（前端默认取最近 50 条，可翻页） |
| PUT | `/chat/messages/{id}/read` | 单条已读 |
| PUT | `/chat/conversations/{conversationId}/read` | 会话已读 |

## 管理端 `/admin`

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/admin/users` | 用户分页（keyword） |
| PUT | `/admin/users/{id}/status` | 启用/禁用/待审核 |
| GET | `/admin/stats` | 总览统计 |
| GET | `/admin/stats/trend?days=7\|30` | 发布趋势 |
| GET | `/admin/export/lost-items` `/found-items` `/users` | Excel 导出（公式注入防护） |
| GET | `/admin/logs` | 操作日志（action/userId 筛选） |

## WebSocket

- 端点：`/ws`（SockJS），连接头携带 `Authorization: Bearer <token>`；
- 可订阅目标：
  - `/user/queue/messages`：新消息（`MessageVO`）
  - `/user/queue/notifications`：新通知（`Notification`）
- 发送消息仍走 REST `/chat/send`（服务端通过 `/user/queue/messages` 推送）。
