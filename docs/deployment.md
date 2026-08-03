# 部署指南

本文档说明系统的两种部署方式、前置条件、配置步骤与验证方法。

## 1. 部署方式概述

| 部署方式 | 适用场景 | 运行依赖 |
|---|---|---|
| Docker 部署 | 生产环境、服务器 | Docker、MySQL 8 |
| 本机 jar 部署 | 单机环境、开发与测试 | JDK 21、MySQL 8（可选 Node.js） |

Docker 部署默认将前端与后端部署于不同主机；也支持同一主机部署，详见
[2.3 同机部署](#23-同机部署)。

两种方式均需满足以下前置条件：

1. MySQL 8 数据库实例，并已创建 `lost_found` 数据库。表结构由应用启动时自动
   创建与迁移，无需手动建表；
2. 可用的 SMTP 发信账户（用于邮箱验证码、离线消息摘要等邮件通知）；
3. 随机生成的 `JWT_SECRET` 密钥，建议使用强随机字符串。

## 2. Docker 部署

Docker 部署默认架构：后端主机运行 Spring Boot 服务与 postgen 服务（文字封面
生成）；前端主机运行 Nginx，负责静态资源托管，并反向代理 `/api`、`/uploads`、
`/ws` 至后端主机。

### 2.1 后端主机

操作步骤：

1. 将 `backend/` 目录部署至目标主机（包含 `docker-compose.yml`、`Dockerfile`、
   `postgen-service/`）。

2. 编辑 `backend/docker-compose.yml`，将以下占位值替换为实际配置：

   | 配置项 | 说明 |
   |---|---|
   | `your_db_password` | 数据库密码。`DB_HOST` 默认 `host.docker.internal`，即宿主机 MySQL |
   | `your_smtp_host` / `your_email` / `your_mail_password` | SMTP 服务器、账号、授权码 |
   | `your_jwt_secret` | JWT 签名密钥（强随机字符串） |
   | `your_frontend_ip` | 前端主机 IP，用于还原真实客户端 IP；配置错误不影响启动，仅影响日志 IP 准确性 |
   | `SITE_BASE_URL`、`APP_CORS_ALLOWED_ORIGINS` | 前端对外访问地址，如 `http://192.168.1.20:5173` |

3. 构建并启动服务：

   ```bash
   cd backend
   docker compose up -d --build
   ```

4. 验证部署：执行 `docker compose ps`，确认 `backend` 与 `postgen` 均为 `Up`
   状态。

注意事项：

- `postgen` 服务随 compose 一并启动，无需单独维护；
- 8080 端口供前端主机 Nginx 反向代理使用，建议通过防火墙仅放行前端主机 IP，
  避免公网直接访问。

### 2.2 前端主机

操作步骤：

1. 将 `web-frontend/` 目录部署至目标主机。

2. 编辑 `web-frontend/docker-compose.yml`：

   - `BACKEND_UPSTREAM`（必填）：填写后端主机地址，如 `http://192.168.1.10:8080`。
     该地址须可由前端主机解析，不可填写仅在后端容器内有效的服务名；
   - `VITE_SERVER_BASE`：保持默认空值，即浏览器仅访问本机 Nginx，由 Nginx 将
     API 请求转发至后端。

3. 构建并启动服务：

   ```bash
   cd web-frontend
   docker compose up -d --build
   ```

4. 验证部署：浏览器访问 `http://<前端主机IP>:5173`，完成注册、登录、发布失物
   信息、图片上传及聊天等操作，确认系统功能正常。

### 2.3 同机部署

如将前后端部署于同一主机，按 2.1、2.2 操作，并作如下调整：

1. 前端 `BACKEND_UPSTREAM`：Nginx 直接运行于宿主机时填写
   `http://127.0.0.1:8080`；Nginx 运行于 Docker 容器时填写
   `http://host.docker.internal:8080`；
2. 后端 `FORWARDED_TRUSTED_PROXIES`：Nginx 运行于宿主机时填写 `127.0.0.1`；
   Nginx 运行于 Docker 容器时填写 Docker 网关网段（如 `172.17.0.0/16`）。

### 2.4 常见问题及处理

| 现象 | 原因 | 处理方式 |
|---|---|---|
| 前端容器启动失败，提示 `host not found in upstream` | `BACKEND_UPSTREAM` 地址无法解析，或后端 8080 端口未开放 | 确认地址正确、后端已启动、防火墙已放行 |
| 后端日志中所有请求 IP 相同 | Docker 端口映射默认（userland-proxy）隐藏真实来源 IP | 在后端主机 `/etc/docker/daemon.json` 设置 `"userland-proxy": false` 并重启 Docker；不影响功能 |
| 后端无法连接数据库 | 数据库地址、密码错误，或 MySQL 未开放连接 | 核对 `DB_HOST`、`DB_PASSWORD`；Linux 下确认 `extra_hosts` 已配置 `host.docker.internal:host-gateway` |

## 3. 本机 jar 部署

本方式不依赖 Docker，部署产物全部位于 `backend/app/` 目录。

### 3.1 前置条件

- JDK 21（启动脚本会自动查找可用的 JDK，优先使用项目内置 JDK）；
- Node.js 18+（可选，仅用于 postgen 文字封面服务；未安装时不影响后端启动）；
- MySQL 8，并创建数据库：

  ```sql
  CREATE DATABASE lost_found DEFAULT CHARACTER SET utf8mb4;
  ```

### 3.2 构建与装配

在 `backend/` 目录执行：

```bat
deploy-app.bat
```

或（Linux/macOS）：

```sh
./deploy-app.sh
```

该脚本执行以下操作：编译 jar；将程序与配置模板装配至 `backend/app/`；生成
配置文件模板 `backend/app/.env`。

### 3.3 配置

编辑 `backend/app/.env`，至少修改以下配置项：

| 配置项 | 说明 |
|---|---|
| `DB_HOST`、`DB_PASSWORD` | 数据库地址与密码 |
| `MAIL_HOST`、`MAIL_USERNAME`、`MAIL_PASSWORD` | SMTP 服务器、账号、授权码 |
| `JWT_SECRET` | JWT 签名密钥（强随机字符串） |

其余配置项可保持默认值。完整配置清单见 `backend/CONFIG.md`。

### 3.4 启动后端

`backend/app/` 目录提供三个启动脚本：

| 脚本（Windows / Linux） | 行为 |
|---|---|
| `start.bat` / `start.sh`（默认） | 自动启动 postgen 后启动后端；后端进程退出时自动停止 postgen |
| `start-with-postgen.bat` / `.sh` | 显式启用 postgen，行为与默认一致 |
| `start-without-postgen.bat` / `.sh` | 不启动 postgen，并禁用封面生成功能 |

说明：

- 后端服务地址为 `http://localhost:8080`；
- 未安装 Node.js 或缺少 `postgen-service/server.js` 时，脚本输出提示并跳过，
  不影响后端启动；
- 后端日志位于 `backend/app/logs/`，postgen 日志位于
  `backend/postgen-work/postgen.log`。

`backend/start-app*.bat|sh` 与 `backend/app/start*.bat|sh` 功能一致，前者为主
脚本，运行时会自动同步部署副本。

### 3.5 前端启动

开发模式：

```bash
cd web-frontend
yarn
yarn dev
```

浏览器访问 `http://localhost:5173`。开发模式默认直连 `localhost:8080`，无需
Nginx。

生产模式：使用 `web-frontend/` 的 Docker 镜像（Nginx），部署步骤见 2.2。

### 3.6 同机完整部署

后端按 3.4 启动于本机 8080 端口；前端 Nginx 亦部署于本机时：

1. `BACKEND_UPSTREAM`：Nginx 运行于宿主机时填写 `http://127.0.0.1:8080`；
   Nginx 运行于 Docker 容器时填写 `http://host.docker.internal:8080`；
2. 在 `backend/app/.env` 增加 `FORWARDED_TRUSTED_PROXIES=127.0.0.1`（Nginx 运行
   于 Docker 容器时填写 Docker 网关网段，如 `172.17.0.0/16`）。

## 4. 通用配置说明

### 4.1 客户端真实 IP

登录防爆破与操作日志使用客户端 IP：

- 后端直接对外（本机 jar 直连）：默认配置不解析 `X-Forwarded-For`，直接使用
  连接方 IP，且无法被伪造；
- 经前端主机 Nginx 反向代理：Nginx 透传 `X-Forwarded-For`，后端设置
  `FORWARDED_TRUSTED_PROXIES` 为前端主机 IP 后即可还原真实客户端 IP。

### 4.2 配置体系

- 常用部署变量：`backend/.env.example`（Docker 方式对应 compose 中的环境变量，
  本机方式对应 `backend/app/.env`）；
- 完整配置项与默认值：`backend/CONFIG.md`；
- 本机方式配置优先级：`backend/app/config/application.yml` 优先于 jar 内置配置，
  环境变量优先于配置文件。

## 5. 上线前检查清单

- 修改默认管理员密码（初始账号 `admin` / `admin123`，登录后立即修改）；
- `JWT_SECRET`、数据库密码、邮箱授权码均已替换为强随机值；
- `SITE_BASE_URL` 与 `APP_CORS_ALLOWED_ORIGINS` 已配置为真实前端地址；
- postgen 服务已随 Docker 启动，或本机方式已确认 `[postgen] ready`；
- MySQL 已创建 `lost_found` 数据库；
- 后端 8080 端口仅对前端主机开放。
