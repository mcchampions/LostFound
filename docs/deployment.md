# 部署指南

## 部署原则

`backend/` 与 `web-frontend/` 独立部署，可分别位于不同机器：

- 后端：Docker（`backend/docker-compose.yml`）或本机 jar（
  `backend/deploy-app.bat|sh` + `start-app.bat|sh`）；
- 前端：Docker（`web-frontend/docker-compose.yml`，Nginx 静态托管）或开发
  服务器；构建产物在 `web-frontend/dist/`。

## 后端 - 本机 jar 部署（非 Docker）

1. `backend\deploy-app.bat`（Windows）或 `backend/deploy-app.sh`
   （Linux/macOS）：`mvn package` 构建并装配 `backend/app/`（jar、从源码复制的
   `config/application.yml`、日志/上传目录、启动脚本副本）；
2. 复制 `backend/.env.example` 为 `backend/app/.env`（脚本自动生成，占位值），
   填写真实凭据；
3. 启动：`backend/app/start.bat` 或 `backend/app/start.sh`（也可用
   `backend/start-app.bat|sh`，主脚本会保证 app 内有副本）；
4. JDK 优先复用 `local/jdk`（本机调试环境），否则使用 PATH 上的 `java`；
   `-Dapp.home` 指向 `backend/app`，配置/日志/上传均在 `backend/app/` 内。

外部配置优先级：`backend/app/config/application.yml` > jar 内置配置；部署
环境变量 `.env` 优先于配置文件（由启动脚本加载）。

## 后端 - Docker

`backend/docker-compose.yml` 包含两个服务：

- `postgen`：文字封面生成服务（Node 容器，仅内部访问）；
- `backend`：Spring Boot 镜像，`depends_on` postgen；

环境变量在 compose 中配置（数据库默认 `host.docker.internal`，即宿主机
MySQL）；挂载 `./config`、`./logs`、`./uploads`（均在 backend 目录内）。

```bash
cd backend
docker compose up -d --build
```

## 前端

`web-frontend/docker-compose.yml` 构建 Nginx 镜像（SPA 路由回退），通过构建
参数指定后端公开地址：

```bash
cd web-frontend
docker compose up -d --build   # VITE_SERVER_BASE 需为浏览器可访问的后端地址
```

## 配置体系

- 常用部署变量：`backend/.env.example`（数据库/邮件/JWT/端口/站点地址/CORS/
  上传路径/postgen 地址）；
- 完整配置清单与默认值：`backend/CONFIG.md`；
- 内置配置 `application.yml` 全部环境变量化；不常改的项用默认值即可，需要
  覆盖时在 `backend/app/config/application.yml` 修改或设置同名环境变量。

## 上线前检查清单

- 修改默认管理员 `admin` 密码；
- `JWT_SECRET`、数据库/邮件凭据替换为强随机值；
- `SITE_BASE_URL`、`APP_CORS_ALLOWED_ORIGINS`、`POSTGEN_BASE_URL` 改为真实
  部署地址；
- postgen 服务已启动（jar 模式）或随 compose 一起部署；
- MySQL 已创建 `lost_found` 库（表由应用启动时自动初始化/迁移）。
