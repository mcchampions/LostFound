# 项目文档

本文档覆盖版本库内的开放目录（`backend/`、`web-frontend/`、根目录脚本等）。
本地调试目录 `local/`、跨工具交接目录 `ai-docs/`、构建产物
（`backend/target/`、`web-frontend/dist/`、`backend/app/`）等运行时/本地目录
不在本文档范围内，相关生成物的用途在 [deployment.md](deployment.md) 中说明。

## 文档结构

| 文档 | 内容 |
|---|---|
| [architecture.md](architecture.md) | 总体架构、技术栈、模块划分、关键数据流 |
| [backend.md](backend.md) | 后端包结构、启动流程、核心业务与后台任务 |
| [api.md](api.md) | REST API 全量参考与 WebSocket 协议 |
| [database.md](database.md) | 数据模型、状态枚举、迁移机制 |
| [security.md](security.md) | 认证、授权、防爆破、上传与审计安全设计 |
| [frontend.md](frontend.md) | 前端目录、路由、全局状态、关键组件 |
| [deployment.md](deployment.md) | 前后端独立部署（本机 jar / Docker）、配置体系 |
| [operations.md](operations.md) | 日志、定时任务、图片生命周期、运维检查点 |

## 快速阅读顺序

1. 先读 [architecture.md](architecture.md) 建立整体认识；
2. 需要对接接口时查 [api.md](api.md)；
3. 需要部署时读 [deployment.md](deployment.md)；
4. 排障运维读 [operations.md](operations.md) 与 [backend.md](backend.md)。

根目录 [README.md](../README.md) 保留项目总览与技术栈速览。
