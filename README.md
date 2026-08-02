# 校园失物招领系统

面向高中校园内部的失物招领系统，前后端分离架构。

完整文档见 [docs/](docs/README.md)（架构、API、数据库、安全、前端、部署、运维）。

## 技术栈

| 层 | 选型 |
|----|------|
| 后端 | Spring Boot 3.3.5 · Java 21 · MyBatis-Plus 3.5.5 · MySQL 8 · Spring Security + JWT · WebSocket(STOMP) · Spring Mail · Apache POI |
| 前端 | React 19 + TypeScript · Vite 8 · MUI 9 · axios · i18next · @stomp/stompjs |
| 构建 | Maven（后端）· Yarn / Vite（前端）|
| API | RESTful，前缀 `/api/v1`，统一返回 `{code, message, data}` |

## 目录结构

```
├── backend/          # Spring Boot 后端源码
│   ├── Dockerfile    # 正式部署镜像
│   └── src/main/java/me/qscbm/projects/lostfound/
│       ├── controller/  service/  mapper/  entity/  dto/
│       ├── security/    config/   common/
│       └── resources/   application.yml · db/
└── web-frontend/     # React + TypeScript 前端源码
    ├── Dockerfile    # 正式部署镜像
    ├── nginx.conf    # 静态资源与 SPA 路由回退
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

前缀 `/api/v1`：认证 `/auth`（含注册、登录、忘记密码 `/forgot-password`、重置密码 `/reset-password`）、用户 `/users`、失物 `/lost-items`、招领 `/found-items`、申请 `/claims`、通知 `/notifications`、公告 `/announcements`、上传 `/upload`、分类 `/categories`、统计 `/admin/stats`、导出 `/admin/export`、日志 `/admin/logs`、聊天 `/chat`（WebSocket `/ws`）。

## 部署

各子目录已提供 `docker-compose.yml`，把其中的占位值改成真实凭据后，直接启动。

### 后端
编辑 `backend/docker-compose.yml`，填写 `DB_PASSWORD`、`MAIL_HOST` / `MAIL_USERNAME` / `MAIL_PASSWORD`、`JWT_SECRET` 等真实值，并把 `APP_CORS_ALLOWED_ORIGINS`、`SITE_BASE_URL`（邮件跳转链接使用的前端地址）改为前端对外访问地址。邮件相关可选项：`MAIL_DIGEST_INTERVAL_MS`（离线未读摘要邮件发送间隔，默认 180000ms）、`MAIL_STATE_CLEAR_INTERVAL_MS`（已提醒状态清空间隔，默认 86400000ms）。
```bash
cd backend
docker compose up -d --build
```
`./uploads` 会挂载到容器 `/app/uploads`（位于 backend 目录内，与 config/logs 一致，启动前创建 `backend/uploads/` 目录即可）。

### 前端
编辑 `web-frontend/docker-compose.yml` 的 `VITE_SERVER_BASE` 为浏览器能够访问的后端公开地址，例如 `https://api.example.com`，不能填写只在服务器内部可解析的容器名。
```bash
cd web-frontend
docker compose up -d --build
```
正式配置按前后端分开部署，前端 Nginx 只负责静态资源和 SPA 路由回退；API、WebSocket 和上传资源直接访问 `VITE_SERVER_BASE`。`local/docker/` 保持前后端统一编排，专用于本地调试。

**外部配置与日志（后端）**：启动时优先读取 jar 同目录 `config/application.yml`（首次从 jar 运行会自动提取内置配置作为模板；版本升级后如缺少新增配置项，请对照内置模板补充）；日志写入 jar 同目录 `logs/`，文件名按「日期-第几次启动」生成。后端配置、日志、上传等运行时数据全部限定在 `backend/` 目录内；前端部署产物限定在 `web-frontend/` 内，前后端可分别部署在不同机器。数据库迁移记录在 `schema_migration` 表，如需重跑某个脚本，删除对应记录后重启即可。

### 后端本机部署（不使用 Docker）

所有产物限定在 `backend/` 内：

1. 运行 `backend\deploy-app.bat`：构建 jar（`mvn package`）并装配 `backend\app\`（jar、从源码复制的 `config\application.yml`、日志/上传目录，并把启动脚本复制为 `app\start.bat`）；
2. 首次启动前把 `backend/.env.example` 复制为 `backend\app\.env` 并填写真实值（模板只包含经常修改的项；其余配置项及默认值见 `backend/CONFIG.md`；`backend/app/` 已 gitignore，凭据不会入库）；
3. 一键启动：Windows 双击 `backend\app\start.bat`（或 `backend\start-app.bat`）；Linux/macOS 运行 `backend\app\start.sh`（或 `backend\start-app.sh`）；主脚本会保证 app 内有启动脚本副本；JDK 优先复用 `local/jdk`，否则使用 PATH 上的 `java`。

Linux/macOS 部署脚本：`backend\deploy-app.sh`（构建 + 装配，与 .bat 等价）。

前端仍独立部署（`web-frontend/` 的 Docker 编排或开发服务器），前后端可不在同一台机器。

### 直接 JAR 部署（无 Docker）
```bash
cd backend && mvn clean package
export DB_HOST=... DB_NAME=lost_found DB_USERNAME=... DB_PASSWORD=...
export MAIL_HOST=... MAIL_USERNAME=... MAIL_PASSWORD=...
export JWT_SECRET=... APP_CORS_ALLOWED_ORIGINS=https://your-domain
java -Dfile.encoding=UTF-8 -jar target/lost-found-1.0.0.jar
```
`app.upload.path=./uploads` 相对 JAR 所在目录解析。

## 开发进度

已实现：认证（注册/登录/邮箱验证/忘记密码）、登录防爆破（用户名+IP 组合锁定 + IP 限流，改密后旧 token 立即失效）、用户、失物、招领、认领申请、通知（WebSocket 实时推送 + 角标）、公告、分类、上传（最长边压缩 1080P，7 天 720P / 30 天 540P，已解决 540P，删除联动清理）、即时聊天（默认最近 50 条，可加载更早消息）、离线未读摘要邮件（每轮离线仅提醒一次，上线或 24 小时后可再次提醒；邮件含快速跳转链接与偏好管理入口，失败自动重试）、登录后全局 WebSocket（任意页面实时收消息/通知）、数据统计（含近 7/30 天趋势）、操作日志（可筛选，关键业务操作落库）、Excel 导出（公式注入防护，含用户导出）、管理后台；配置支持 jar 外 config/ 外部化 + 按「日期-启动序号」写本地日志文件；前端 21 个页面（路由懒加载分包）+ i18n 中文化。后端含 78 个单元测试。
