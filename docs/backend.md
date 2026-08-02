# 后端

## 包结构

| 包 | 职责 |
|---|---|
| `controller` | REST 入口，参数校验、鉴权上下文 |
| `service` / `service.impl` | 业务逻辑；另含邮件、图片、离线邮件、操作审计等支撑组件 |
| `mapper` | MyBatis-Plus 数据访问（含少量原生 SQL） |
| `entity` / `dto` | 数据库实体与请求/响应对象 |
| `common` | `Result`/`PageResult`/`BusinessException`/全局异常处理/工具类 |
| `config` | 安全、WebSocket、MyBatis-Plus、异步、数据库初始化 |
| `security` | JWT 工具与过滤器、WebSocket 鉴权拦截器 |

## 启动流程

1. `LostFoundApplication.main`：
   - 解析 `AppHome`（jar 所在目录或工作目录）；
   - 从 jar 运行时首次提取内置配置到 `<home>/config/application.yml`；
   - 按「日期-第几次启动」生成日志文件，写入 `logs/`；
   - 存在 `<home>/config/` 时将其注册为外部配置（优先于内置）；
2. Spring 上下文启动；
3. `DatabaseInitializer`：创建 `schema_migration` 记录表 → 按序执行未记录的
   SQL 脚本（含注释剥离与幂等处理）→ 成功后记录脚本名。

## 核心业务模块

| 模块 | 位置 | 说明 |
|---|---|---|
| 认证 | `AuthServiceImpl` | 注册/登录/管理员登录/刷新/忘记密码（邮箱验证码重置） |
| 用户 | `UserServiceImpl` | 资料、改密、邮箱验证、邮件偏好、公开主页 |
| 失物/招领 | `Lost/FoundItemServiceImpl` | 发布/编辑/删除/状态与解决信息 |
| 认领 | `ClaimServiceImpl` | 申请、处理（通过级联拒绝+自动会话+压缩图片） |
| 通知 | `NotificationServiceImpl` | 站内通知 CRUD、未读计数 |
| 聊天 | `MessageServiceImpl` | 会话、消息、已读；配合 WebSocket 推送 |
| 管理端 | `AdminController` | 用户/分类/统计/趋势/导出/操作日志 |
| 封面生成 | `CoverGenServiceImpl` | 调用 postgen 服务，限流+模板白名单 |
| 文件 | `UploadController` / `FileController` | 上传校验压缩、静态文件与占位图 |

## 支撑组件

| 组件 | 职责 |
|---|---|
| `OfflineMessageEmailTracker` | 离线未读会话内存跟踪（每轮一次提醒） |
| `MessageDigestMailTask` | 每 3 分钟发送未读摘要邮件 |
| `EmailRetryQueue` | 邮件失败退避重试（容量/批次上限） |
| `EmailContentBuilder` | HTML/纯文本邮件模板（转义 + 跳转链接） |
| `ImageStorageService` | 图片压缩与删除生命周期 |
| `OperationLogRecorder` | 关键业务操作审计落库 |
| `LoginAttemptService` | 登录防爆破（用户名+IP 组合锁定、IP 限流） |
| `WebSocketPresenceService` | 在线状态（单机内存） |
| `CodeHasher` | 验证码 SHA-256+盐哈希 |

## 后台定时任务

| 任务 | 周期 | 说明 |
|---|---|---|
| `MessageDigestMailTask` | 3 分钟 | 离线未读摘要邮件 |
| `OfflineMessageEmailTracker.clearAllStates` | 24 小时 | 重置已提醒状态 |
| `ImageStorageService.compressByAge` | 每天 03:30 | 按上传日期压缩图片 |
| `OperationLogServiceImpl.cleanupExpiredLogs` | 每天 04:00 | 清理过期操作日志 |
| `EmailRetryQueue.retryDue` | 5 分钟 | 邮件重试 |
| `LoginAttemptService.cleanupStaleEntries` | 1 小时 | 登录防爆破记录清理 |
| `CoverGenServiceImpl.cleanupExpiredWindows` | 1 小时 | 封面限流窗口清理 |

## 配置体系

- `src/main/resources/application.yml`：全部配置项支持环境变量并带默认值；
- 外部配置：`<home>/config/application.yml` 存在时优先（jar 模式即
  `backend/app/config/`）；
- 部署环境变量：`backend/.env.example`（常用项）→ `backend/app/.env`；
  完整清单见 `backend/CONFIG.md`。
