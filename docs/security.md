# 安全设计

## 认证

- 密码：BCrypt（`BCryptPasswordEncoder`），仅存哈希，永不明文；
- 验证码（邮箱验证/重置密码）：SHA-256 + 随机盐（`CodeHasher`），5 分钟有效、
  60 秒发送冷却、最多 5 次尝试；
- JWT：24 小时有效；登录后仅通过 HttpOnly `AUTH_TOKEN` Cookie 传输，每次请求回查数据库（角色/状态以库为准）；
- Cookie 会话的非幂等请求校验 `Origin`/`Referer`，仅允许 `APP_CORS_ALLOWED_ORIGINS` 中的来源，避免跨站请求伪造；
- **改密后旧 token 立即失效**：用户表 `password_changed_at` 与 token 签发时间
  比对（HTTP 与 WebSocket 均校验）。

## 登录防爆破

- 用户名 + IP 组合锁定：连续失败达阈值（默认 5 次）锁定 15 分钟，单个攻击 IP
  无法锁死其他来源的正常登录；
- IP 滑动窗口限流（默认 10 分钟 20 次）；
- 失败记录每小时自动清理；失败事件写入操作审计。

## 授权

- `SecurityConfig`：无状态 JWT；管理端点 `hasRole("ADMIN")`；公开接口白名单
  （认证、列表/详情、公开主页、上传文件读取）；图片上传动作必须认证；
- 注册不可自封 ADMIN；TEACHER 默认待审核；
- 资源归属校验：物品/申请/通知仅发布者或相关方可操作。

## WebSocket 安全

- CONNECT 必须携带有效 JWT Cookie（或兼容的 Authorization 头），且校验用户状态与改密时间；
- 订阅白名单：仅 `/user/queue/messages` 与 `/user/queue/notifications`；
- 禁止客户端向 broker 直接发送消息。

## 上传安全

- 大小 ≤5MB、像素 ≤2000 万；
- magic bytes 校验真实格式（JPEG/PNG/GIF）后重新解码编码（剥离 EXIF）；
- 随机 UUID 文件名 + 日期目录 + 路径穿越防护；
- 上传即压缩到最长边 1080P。

## 输出安全

- 邮件正文 HTML 转义（用户内容防注入）；
- Excel 导出对 `= + - @ \t \r` 开头内容前置单引号（公式注入防护）；
- 公开主页不暴露邮箱/手机号/账号状态。

## 审计

- `operation_log`：注册/登录/失败登录/改密/邮箱验证/物品增删改/认领/公告/分类/
  导出等关键操作落库（含 IP），管理端可筛选查看；
- 默认保留 365 天，每日自动清理。
