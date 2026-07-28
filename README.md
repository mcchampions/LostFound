# 校园失物招领系统

面向高中校园内部的失物招领系统，前后端分离架构。

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
    ├── nginx.conf    # /api /ws /uploads 反代
    └── src/          pages/ components/ api/ i18n/
```

Maven 包名 `me.qscbm.projects.lostfound`，artifactId `lost-found`。

## 数据模型与状态

9 张表：`user`、`category`、`lost_item`、`found_item`、`claim_application`、`notification`、`announcement`、`operation_log`、`system_config`（另有 `message`、`resolver_email` 迁移）。

物品状态枚举（`ItemStatus`）：

| 表 | 初始 | 终态 | 语义 |
|----|------|------|------|
| lost_item（失物）| `LOST` | `FOUND` | 丢失中 → 已找到 |
| found_item（招领）| `UNCLAIMED` | `CLAIMED` | 待认领 → 已认领 |

认领申请通过时由 `ClaimServiceImpl` 联动设置终态。

## API 概要

前缀 `/api/v1`：认证 `/auth`、用户 `/users`、失物 `/lost-items`、招领 `/found-items`、申请 `/claims`、通知 `/notifications`、公告 `/announcements`、上传 `/upload`、分类 `/categories`、统计 `/admin/stats`、导出 `/admin/export`、日志 `/admin/logs`、聊天 `/chat`（WebSocket `/ws`）。

## 部署

各子目录已提供 `docker-compose.yml`，把其中的占位值改成真实凭据后，直接启动。

### 后端
编辑 `backend/docker-compose.yml`，填写 `DB_PASSWORD`、`MAIL_HOST` / `MAIL_USERNAME` / `MAIL_PASSWORD`、`JWT_SECRET`、`APP_CORS_ALLOWED_ORIGINS` 等真实值。
```bash
cd backend
docker compose up -d --build
```
`../uploads` 会挂载到容器 `/app/uploads`（启动前在项目根创建 `uploads/` 目录）。

### 前端
编辑 `web-frontend/docker-compose.yml` 的 `VITE_SERVER_BASE` 为后端地址。
```bash
cd web-frontend
docker compose up -d --build
```
`nginx.conf` 已配置 SPA 回退与 `/api`、`/ws`、`/uploads` 反代到后端。

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

已实现：认证、用户、失物、招领、认领申请、通知、公告、分类、上传、即时聊天、数据统计、操作日志、Excel 导出、管理后台；前端 17 个页面 + i18n 中文化。后端含 7 个单元测试。
