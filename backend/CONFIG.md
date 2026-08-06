# backend 配置说明

部署时**只需要关注 `backend/app/.env`**(由 `backend/.env.example` 复制而来),
里面只包含经常修改的项。其余配置项全部在 `backend/src/main/resources/application.yml`
中有默认值,一般无需修改;需要覆盖时有两种方式(环境变量优先):

1. 在 `backend/app/config/application.yml` 中直接修改(该文件由部署脚本从源码复制);
2. 启动前设置同名环境变量。

`start-app.bat` / `start-app.sh` 会自动加载 `backend/app/.env`。

## 完整配置项清单

| 环境变量 | 默认值 | 说明 | 位置 |
|---|---|---|---|
| `DB_HOST` | `localhost` | 数据库地址 | .env |
| `DB_PORT` | `3306` | 数据库端口 | .env |
| `DB_NAME` | `lost_found` | 数据库名 | .env |
| `DB_USERNAME` | `root` | 数据库用户 | .env |
| `DB_PASSWORD` | 无 | 数据库密码 | .env（必须修改） |
| `MAIL_HOST` | 无 | SMTP 服务器 | .env（必须修改） |
| `MAIL_PORT` | `465` | SMTP 端口 | .env |
| `MAIL_USERNAME` | 无 | SMTP 账号 | .env（必须修改） |
| `MAIL_PASSWORD` | 无 | SMTP 密码 | .env（必须修改） |
| `JWT_SECRET` | 无 | JWT 签名密钥 | .env（必须修改） |
| `SERVER_PORT` | `8080` | 后端端口 | .env |
| `SITE_BASE_URL` | `http://localhost:5173` | 邮件跳转链接的前端地址 | .env |
| `APP_CORS_ALLOWED_ORIGINS` | `http://localhost:5173` | 允许的明确跨域来源（禁止 `*`） | .env |
| `AUTH_COOKIE_SECURE` | `false` | 认证 Cookie 是否仅通过 HTTPS 发送；HTTPS 部署应设为 `true` | .env |
| `AUTH_COOKIE_SAME_SITE` | `Lax` | 认证 Cookie SameSite 策略；跨站部署设为 `None` | .env |
| `APP_UPLOAD_PATH` | `./uploads` | 上传目录（相对 app 目录） | .env |
| `POSTGEN_ENABLED` | `true` | 文字封面生成开关（jar 模式需自行启动 postgen-service，否则请改 false） | .env |
| `POSTGEN_BASE_URL` | `http://localhost:3000` | postgen 服务地址（postgen 在其他机器/端口时必改；`start-app*.bat/sh` 默认自动启动本机 postgen） | .env |
| `POSTGEN_TOKEN` | 无 | 后端与 postgen 的共享认证令牌（必须修改） | .env |
| `POSTGEN_PORT` | `3000` | postgen 监听端口（`start-app*.bat/sh` 自动启动 postgen 时使用，须与 `POSTGEN_BASE_URL` 端口一致） | .env |
| `FORWARD_HEADERS_STRATEGY` | `native` | 代理头解析策略。jar 直连保持默认即可；默认 native + 空信任列表 = 不解析 XFF，行为等同于不信任任何代理 | .env |
| `FORWARDED_TRUSTED_PROXIES` | 空 | 可信代理 IP/网段（逗号分隔）。jar 直连留空；分拆部署（前端机反向代理）时填前端机 IP | .env |
| `JWT_EXPIRATION_MS` | `86400000` | token 有效期（毫秒） | 默认即可 |
| `MAX_FILE_SIZE` | `5MB` | 单文件上传上限 | 默认即可 |
| `MAX_REQUEST_SIZE` | `25MB` | 请求体上限 | 默认即可 |
| `MAIL_DIGEST_INTERVAL_MS` | `180000` | 离线未读摘要发送间隔 | 默认即可 |
| `MAIL_STATE_CLEAR_INTERVAL_MS` | `86400000` | 已提醒状态清空间隔 | 默认即可 |
| `MAIL_RETRY_MAX_ATTEMPTS` | `5` | 邮件失败重试上限 | 默认即可 |
| `MAIL_RETRY_BACKOFF_SECONDS` | `60` | 邮件重试退避秒数 | 默认即可 |
| `MAIL_RETRY_INTERVAL_MS` | `300000` | 邮件重试周期 | 默认即可 |
| `MAIL_RETRY_QUEUE_CAPACITY` | `10000` | 邮件重试队列容量 | 默认即可 |
| `MAIL_RETRY_BATCH_SIZE` | `100` | 每轮重试批次数 | 默认即可 |
| `LOG_RETENTION_DAYS` | `365` | 操作日志保留天数 | 默认即可 |
| `POSTGEN_RATE_LIMIT` | `10` | 封面生成每用户每分钟次数 | 默认即可 |
| `LOGIN_MAX_FAILURES` | `5` | 登录连续失败锁定阈值 | 默认即可 |
| `LOGIN_LOCKOUT_MINUTES` | `15` | 登录锁定分钟数 | 默认即可 |
| `LOGIN_IP_MAX_ATTEMPTS` | `20` | IP 滑动窗口限流次数 | 默认即可 |
| `LOGIN_IP_WINDOW_MINUTES` | `10` | IP 限流窗口 | 默认即可 |
| `TABLE_PREFIX` | 空 | 表前缀 | 默认即可 |
| `MYBATIS_LOG_IMPL` | slf4j | SQL 日志实现 | 默认即可 |
| `LOG_LEVEL_APP` | `info` | 业务包日志级别 | 默认即可 |
| `LOG_LEVEL_SQL` | `off` | SQL 日志级别（本地调试可 `debug`） | 默认即可 |

## 本机 jar 启动脚本（backend/ 或 backend/app/）

| 脚本 | 行为 |
|---|---|
| `start-app.bat` / `start-app.sh`（默认） | 自动启动 postgen 后再启动后端 jar；后端退出时自动停止 postgen |
| `start-app-with-postgen.bat` / `.sh` | 显式带 postgen，行为与默认相同 |
| `start-app-without-postgen.bat` / `.sh` | 只启动后端 jar，并强制 `POSTGEN_ENABLED=false`（封面生成功能不可用） |

`deploy-app.bat|sh` 会把以上脚本复制到 `backend/app/`（`start-app-*.bat` 对应
`start-*.bat`）。postgen 需要本机安装 Node（`node` 在 PATH 中）；未安装或找不到
`postgen-service/server.js` 时会提示并跳过，不影响后端启动。postgen 日志写在
`backend/postgen-work/postgen.log`（Windows 为 `.err.log` 记录错误输出）。

## 客户端真实 IP 还原

登录防爆破与操作日志记录使用 `getRemoteAddr()`。默认配置（`native` + 空信任
列表）**不解析任何 `X-Forwarded-For` 头**，jar 直连部署时拿到的是真实客户端
IP，且无法被伪造。分拆部署（前端机反向代理）时才需要设置
`FORWARDED_TRUSTED_PROXIES=前端机IP`；同机部署填 `127.0.0.1`。

## 运行时目录（全部限定在 backend 内）

```
backend/app/
├── lost-found-1.0.0.jar   # 后端 jar
├── .env                   # 部署环境变量（gitignored）
├── config/application.yml # 外部配置（从源码复制，优先于 jar 内置）
├── logs/                  # 日志（日期-第几次启动.log）
└── uploads/               # 上传文件
```
