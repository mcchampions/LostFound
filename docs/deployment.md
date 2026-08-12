# 部署指南

本文档说明系统的实体部署方式（不使用 Docker）：后端以 Spring Boot jar 部署，
前端为标准静态构建产物，由任意静态 Web 服务器托管。默认前后端分机部署，
同机部署为特例。

## 1. 部署架构与前置条件

### 1.1 默认架构（前后端分机）

- 后端机：MySQL 8、后端 jar、postgen 服务（Node，文字封面生成）；
- 前端机：任意静态 Web 服务器、前端构建产物（`dist/`）。

浏览器访问前端机。前端机可将 `/api`、`/uploads` 反向代理至后端机，
也可由前端直连后端（见 3.1）。后端 8080 端口默认仅对前端机开放。

### 1.2 前置条件

1. 后端机：JDK 21、Maven 3.9+（构建机）、MySQL 8、Node.js 18+（postgen）；
2. 前端机：Node.js 18+（构建机）、任意静态 Web 服务器；
3. MySQL 已创建 `lost_found` 数据库（表结构由应用启动时自动创建与迁移）：

   ```sql
   CREATE DATABASE lost_found DEFAULT CHARACTER SET utf8mb4;
   ```

4. 可用的 SMTP 发信账户（邮箱验证码、离线消息摘要等邮件通知）；
5. 随机生成的 `JWT_SECRET` 密钥，建议使用强随机字符串。

## 2. 后端部署（后端机）

### 2.1 构建与装配

在 `backend/` 目录执行：

```bat
deploy-app.bat
```

Linux/macOS：

```sh
./deploy-app.sh
```

该脚本编译 jar，并将程序与配置模板装配至 `backend/app/`（jar、`config/`、
`.env`、启动脚本）。

### 2.2 配置

编辑 `backend/app/.env`，至少修改以下配置项：

| 配置项 | 说明 |
|---|---|
| `DB_HOST`、`DB_PORT`、`DB_NAME`、`DB_USERNAME`、`DB_PASSWORD` | 数据库连接 |
| `MAIL_HOST`、`MAIL_PORT`、`MAIL_USERNAME`、`MAIL_PASSWORD` | SMTP 发信 |
| `JWT_SECRET` | JWT 签名密钥（强随机字符串） |
| `SITE_BASE_URL`、`APP_CORS_ALLOWED_ORIGINS` | 前端对外访问地址，如 `http://192.168.1.20`；CORS 必须填写明确来源，禁止 `*` |
| `AUTH_COOKIE_SECURE`、`AUTH_COOKIE_SAME_SITE` | HTTPS 部署将 Secure 设为 `true`；跨站部署同时将 SameSite 设为 `None`，同站保持 `Lax` |
| `FORWARDED_TRUSTED_PROXIES` | 前端机 IP（使用反向代理时填写，见第 5 节） |

其余配置项可保持默认值。完整配置清单见 `backend/CONFIG.md`。

### 2.3 启动后端

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
- 检测到 `POSTGEN_PORT` 已被占用时，脚本会交互询问是否结束占用进程（英文
  提示 `Kill this process and start postgen? [y/N]`）：选择 `y` 结束进程后
  启动 postgen，选择 `N` 则跳过 postgen 直接启动后端，不会自动强杀；
- 后端日志位于 `backend/app/logs/`，postgen 日志位于
  `backend/postgen-work/postgen.log`。

`backend/start-app*.bat|sh` 与 `backend/app/start*.bat|sh` 功能一致，前者为主
脚本，运行时会自动同步部署副本。

时间基准：业务时间默认按 `Asia/Shanghai`（与数据库 `serverTimezone` 一致），
一般无需修改；如需覆盖，通过 JVM 参数 `-Dapp.timezone=<zone>` 设置，且必须
与数据库时区保持一致。

### 2.4 安全

使用反向代理时，通过防火墙仅放行前端机 IP 访问 8080 端口；前端直连后端时，
按实际网络环境限制 8080 的访问范围。

## 3. 前端部署（前端机）

前端是标准 Vite 静态构建产物，部署只依赖静态文件托管，不限定具体 Web 服务器。

### 3.1 构建与连接方式

在 `web-frontend/` 目录执行：

```bash
yarn
yarn build
```

构建产物位于
`web-frontend/dist/`。

前后端连接方式二选一：

- 方式一（同源反代，推荐默认）：构建时不设置 `VITE_SERVER_BASE`（生产构建
  默认同源）。浏览器只访问前端地址，由托管服务器将 `/api`、`/uploads`
  转发到后端机。后端无需对客户端开放。
- 方式二（前端直连后端）：构建时设置
  `VITE_SERVER_BASE=http://<后端机IP>:8080`。任意静态服务器或 CDN 均可托管，
  无需反向代理；浏览器直接请求后端，后端需在 `APP_CORS_ALLOWED_ORIGINS`
  放行前端来源，且 8080 端口对客户端可达。

### 3.2 托管静态资源

将 `dist/` 内容复制到任意静态 Web 服务器的站点目录。可用服务器包括但不限于：
Nginx、Apache、Caddy、Node.js 静态服务器、对象存储/CDN。

采用方式一（同源反代）时，托管服务器需满足以下要求：

- SPA 路由回退：未命中文件的路由返回 `index.html`；
- `/api`、`/uploads` 反向代理至后端机；`/api/v1/chat/stream` 必须允许长连接；
- 请求体上限不低于 25MB（与后端 `MAX_REQUEST_SIZE` 一致）；
- 透传 `X-Real-IP`、`X-Forwarded-For`、`X-Forwarded-Proto`。

以下为两种常见服务器的配置示例，其他服务器按相同要求配置即可。

Nginx 示例：

```nginx
server {
    listen 80;
    server_name _;
    root /var/www/lostfound;              # dist 目录
    client_max_body_size 25m;

    location / {
        try_files $uri $uri/ /index.html;
    }
    location /api/ {
        proxy_pass http://<后端机IP>:8080;
        proxy_buffering off;
        proxy_read_timeout 1h;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    location /uploads/ {
        proxy_pass http://<后端机IP>:8080;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Caddy 示例：

```caddy
http://<前端机IP> {
    root * /var/www/lostfound
    try_files {path} /index.html
    file_server
    reverse_proxy /api/* http://<后端机IP>:8080
    reverse_proxy /uploads/* http://<后端机IP>:8080
    request_body {
        max_size 25MB
    }
}
```

采用方式二（前端直连后端）时，任意静态服务器或 CDN 直接托管 `dist/` 即可，
无需上述反代配置。

### 3.3 启动与验证

启动 Web 服务器后，浏览器访问 `http://<前端机IP>`（默认 80 端口），完成注册、
登录、发布失物/招领、图片上传与聊天等操作，确认系统功能正常。

## 4. 同机部署（特例）

默认前后端分机部署；仅在需要时将前后端部署于同一主机：

1. 后端按第 2 节部署并启动于本机 8080 端口；
2. 前端按第 3 节部署；方式一的反向代理目标改为 `http://127.0.0.1:8080`；
3. `backend/app/.env` 中 `FORWARDED_TRUSTED_PROXIES=127.0.0.1`。

## 5. 客户端真实 IP

登录防爆破与操作日志使用客户端 IP：

- 后端直接对外（无反代，含方式二）：默认配置（`native` + 空信任列表）不解析
  `X-Forwarded-For`，直接使用连接方 IP，且无法被伪造；
- 经前端机反向代理（方式一）：代理服务器透传 `X-Real-IP`、
  `X-Forwarded-For`、`X-Forwarded-Proto`，后端设置
  `FORWARDED_TRUSTED_PROXIES` 为前端机 IP 后，即还原真实客户端 IP；
  同机部署填 `127.0.0.1`；
- 多台前端机时，`FORWARDED_TRUSTED_PROXIES` 用逗号分隔多个 IP。

## 6. 上线前检查清单

- 修改默认管理员密码（初始账号 `admin` / `admin123`，登录后立即修改）；
- `JWT_SECRET`、数据库密码、邮箱授权码均已替换为强随机值；
- `SITE_BASE_URL` 与 `APP_CORS_ALLOWED_ORIGINS` 已配置为真实前端地址；
- 使用反向代理时，后端 `FORWARDED_TRUSTED_PROXIES` 已配置为前端机 IP；
- postgen 服务已启动，或已确认 `[postgen] ready`；
- MySQL 已创建 `lost_found` 数据库；
- 后端 8080 端口访问范围已按部署形态限制。
