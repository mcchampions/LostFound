# 校园失物招领系统

面向高中校园内部的失物招领系统，前后端分离架构。

完整文档见 [docs/](docs/README.md)（架构、API、数据库、安全、前端、部署、运维）。

## 技术栈

| 层 | 选型 |
|----|------|
| 后端 | Spring Boot 3.3.5 · Java 21 · MyBatis-Plus 3.5.5 · MySQL 8 · Spring Security + JWT · SSE · Spring Mail · Apache POI |
| 前端 | React 19 + TypeScript · Vite 8 · MUI 9 · axios · i18next · EventSource |
| 构建 | Maven（后端）· Yarn / Vite（前端）|
| API | RESTful，前缀 `/api/v1`，统一返回 `{code, message, data}` |

## 目录结构

```
├── backend/          # Spring Boot 后端源码
│   ├── deploy-app.bat / .sh   # 构建并装配 backend/app/
│   ├── postgen-service/       # postgen2 修改版源码 + 封面生成 HTTP 服务
│   └── src/main/java/me/qscbm/projects/lostfound/
│       ├── controller/  service/  mapper/  entity/  dto/
│       ├── security/    config/   common/
│       └── resources/   application.yml · db/
└── web-frontend/     # React + TypeScript 前端源码
    └── src/          pages/ components/ api/ i18n/
```

Maven 包名 `me.qscbm.projects.lostfound`，artifactId `lost-found`。

各子项目含独立 README：[backend/README.md](backend/README.md)、[web-frontend/README.md](web-frontend/README.md)、[backend/postgen-service/README.md](backend/postgen-service/README.md)。

## 数据模型与状态

13 张表：`user`、`email_verification_code`、`category`、`lost_item`、`found_item`、`claim_application`、`notification`、`announcement`、`operation_log`、`system_config`、`message`、`user_email_preference`、`password_reset_code`。

物品状态枚举（`ItemStatus`）：

| 表 | 初始 | 终态 | 语义 |
|----|------|------|------|
| lost_item（失物）| `LOST` | `FOUND` | 丢失中 → 已找到 |
| found_item（招领）| `UNCLAIMED` | `CLAIMED` | 待认领 → 已认领 |

认领申请通过时由 `ClaimServiceImpl` 联动设置终态。

## API 概要

前缀 `/api/v1`：认证 `/auth`（含注册、登录、忘记密码 `/forgot-password`、重置密码 `/reset-password`）、用户 `/users`、失物 `/lost-items`、招领 `/found-items`、申请 `/claims`、通知 `/notifications`、公告 `/announcements`、上传 `/upload`、分类 `/categories`、统计 `/admin/stats`、导出 `/admin/export`、日志 `/admin/logs`、聊天 `/chat`（SSE `/chat/stream`）。

## 部署

完整的部署步骤参见 [docs/deployment.md](docs/deployment.md)。系统采用实体部署
（不使用 Docker），默认前后端分机部署，也支持同机部署。

### 后端机

1. 构建装配：Windows 运行 `backend\deploy-app.bat`，Linux/macOS 运行
   `backend/deploy-app.sh`（产物都在 `backend\app\`）；
2. 填配置：编辑 `backend\app\.env`（数据库、邮箱、`JWT_SECRET`、前端地址、
   `FORWARDED_TRUSTED_PROXIES`）；
3. 启动后端：`backend\app\start.bat`（默认自动带 postgen 封面服务；如需禁用封面
   生成功能，使用 `start-without-postgen.bat`），Linux 使用对应的 `.sh`；后端地址
   `http://localhost:8080`；

### 前端机

1. 构建：`cd web-frontend && yarn && yarn build`，产物在 `dist/`（默认同源模式）；
2. 将 `dist/` 复制到任意静态 Web 服务器（Nginx、Apache、Caddy、Node 静态服务等）
   的站点目录；
3. 默认由托管服务器将 `/api`、`/uploads` 反代到后端机地址；也可在构建时
   设置 `VITE_SERVER_BASE` 直连后端，无需反代（详见部署文档）；
4. 启动 Web 服务器，浏览器访问 `http://<前端机IP>`。

> 后端配置/日志/上传全部限定在 `backend/` 内；数据库迁移记录在 `schema_migration`
> 表，如需重跑某个迁移脚本，删除对应记录后重启即可。客户端 IP、配置体系和上线
> 检查清单见 `docs/deployment.md`。

## 开发进度

已实现：认证（注册/登录/邮箱验证/忘记密码）、登录防爆破（用户名+IP 组合锁定 + IP 限流，改密后旧 token 立即失效）、用户、失物、招领、认领申请、通知（SSE 实时推送 + 角标）、公告、分类、上传（最长边压缩 1080P，7 天 720P / 30 天 540P，已解决 540P，删除联动清理）、即时聊天（默认最近 50 条，可加载更早消息）、离线未读摘要邮件（每轮离线仅提醒一次，上线或 24 小时后可再次提醒；邮件含快速跳转链接与偏好管理入口，失败自动重试）、登录后全局 SSE（任意页面实时收消息/通知）、数据统计（含近 7/30 天趋势）、操作日志（可筛选，关键业务操作落库）、Excel 导出（公式注入防护，含用户导出）、管理后台；配置支持 jar 外 config/ 外部化 + 按「日期-启动序号」写本地日志文件；前端 21 个页面（路由懒加载分包）+ i18n 中文化。
