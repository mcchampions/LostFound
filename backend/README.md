# 校园失物招领 - 后端

Spring Boot 后端服务,提供 REST API 与 WebSocket,面向高中校园失物招领业务。
前端仓库见 `web-frontend/`,文字封面生成服务见 `backend/postgen-service/`。

## 技术栈

- Java 21 · Spring Boot 3.3.5 · MyBatis-Plus 3.5.5 · MySQL 8
- Spring Security + JWT · STOMP WebSocket · Spring Mail · Apache POI
- 构建:Maven(Java) / Node(postgen-service)

## 目录结构

```
backend/
├── src/main/java/me/qscbm/projects/lostfound/
│   ├── controller/  service/  mapper/  entity/  dto/
│   ├── common/      config/   security/
├── src/main/resources/
│   ├── application.yml       # 配置(全量环境变量化)
│   ├── logback-spring.xml    # 控制台 + 文件日志
│   └── db/                   # SQL 初始化与迁移脚本
├── postgen-service/          # 文字封面生成服务(Node)
├── Dockerfile / docker-compose.yml
├── deploy-app.bat / .sh      # 本机 jar 部署(装配 backend/app/)
├── start-app.bat / .sh       # 本机一键启动
├── .env.example              # 部署环境变量模板(常用项)
├── CONFIG.md                 # 完整配置项清单与默认值
└── pom.xml
```

## 环境要求

- JDK 21、Maven 3.9+;
- MySQL 8(需预先创建 `lost_found` 数据库;表结构由应用启动时自动初始化/迁移,
  `db/` 内脚本也可手动执行);
- 可选:Node 18+(仅运行 postgen 服务时需要)。

## 构建与测试

```bash
mvn package -DskipTests   # 打包
mvn test                  # 单元测试
```

## 配置

- 内置配置 `src/main/resources/application.yml` 全部支持环境变量并带默认值;
- 部署环境变量:`.env.example`(常用项)→ 部署时复制为 `backend/app/.env`;
- 完整配置项与默认值见 `CONFIG.md`;
- 外部配置:存在 `<home>/config/application.yml` 时优先(jar 模式即
  `backend/app/config/`);
- 日志写入 `<home>/logs/`,`日期-第几次启动.log`。

## 运行

### 本机 jar(非 Docker)

```bat
deploy-app.bat    :: 构建并装配 backend\app\(jar + config + .env + 启动脚本)
app\start.bat     :: 一键启动(或 start-app.bat,等价)
```

Linux/macOS 使用 `deploy-app.sh` / `start-app.sh`。JDK 优先复用
`../../local/jdk`(相对 `backend/app/` 的两级上级),否则使用 PATH 上的 `java`;
`-Dapp.home` 指向 `backend/app`。

### Docker

```bash
docker compose up -d --build   # postgen + backend
```

数据库默认连接宿主机 `host.docker.internal`;config/logs/uploads 挂载均在
backend 目录内。

## 相关文档

- 完整项目文档:`docs/`(架构/API/数据库/安全/部署/运维)
- 配置说明:`CONFIG.md`
- 封面生成服务:`postgen-service/README.md`
