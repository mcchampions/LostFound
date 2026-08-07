# 数据模型

## 表清单

业务表 13 张（`backend/src/main/resources/db/`）+ 运行时记录表 1 张：

| 表 | 说明 |
|---|---|
| `user` | 用户（角色/状态/邮箱验证/改密时间） |
| `email_verification_code` | 邮箱验证码（哈希存储） |
| `category` | 物品分类 |
| `lost_item` | 失物（状态 LOST/FOUND，时间范围，解决信息） |
| `found_item` | 招领（状态 UNCLAIMED/CLAIMED，同上） |
| `claim_application` | 认领申请（PENDING/APPROVED/REJECTED，`pending_key` 防重复） |
| `notification` | 站内通知（类型/关联对象） |
| `announcement` | 公告 |
| `operation_log` | 操作审计（动作/目标/IP/描述） |
| `system_config` | 站点配置 |
| `message` | 聊天消息（会话/未读/`USER` 或 `NARRATION` 类型） |
| `user_email_preference` | 邮件偏好（按类型开关 + 摘要状态） |
| `password_reset_code` | 重置密码验证码（哈希存储） |
| `schema_migration` | 已应用 SQL 脚本记录（运行时由 `DatabaseInitializer` 维护） |

## 状态枚举

| 表 | 初始 | 终态 | 语义 |
|---|---|---|---|
| `lost_item` | `LOST` | `FOUND` | 丢失中 → 已找到 |
| `found_item` | `UNCLAIMED` | `CLAIMED` | 待认领 → 已认领 |
| `claim_application` | `PENDING` | `APPROVED`/`REJECTED` | 申请处理 |
| `user.role` | — | `STUDENT`/`TEACHER`/`ADMIN` | 角色 |
| `user.status` | — | `PENDING`/`ACTIVE`/`INACTIVE` | 账号状态 |

物品解决信息：`resolved_type`（SELF/USER/OTHER）、`resolved_by`、`resolved_note`。

## 约束与索引要点

- 唯一键：`user.username`、`user.email`、`category.name`、
  `claim_application.pending_key`（生成列，仅 PENDING 时非空）、
  `system_config.config_key`；
- 外键：用户/分类/解决者/公告发布者等关联，用户删除时通知与偏好级联；
- 索引：物品过滤（status/category/created_at）、认领收发、通知未读、
  消息会话与未读、日志时间等；
- `notification.related_id`、`claim_application.item_id` 为多态引用，无外键。

## 迁移机制

- `DatabaseInitializer` 启动时按固定顺序执行 `db/*.sql`；
- 执行前剥离整行注释（`stripCommentLines`），避免注释与语句合并；
- `ALTER` 通过 `information_schema` 探测幂等；`CREATE IF NOT EXISTS`/`INSERT
  IGNORE` 天然幂等；
- 脚本成功执行后写入 `schema_migration`，后续启动跳过；失败不记录、下次重试；
- 如需重跑某个脚本：删除 `schema_migration` 对应记录后重启。

## 初始化数据

- 8 个默认分类；
- 默认管理员 `admin`（BCrypt，初始密码见脚本注释，**上线前必须修改**）；
- 站点配置 `site_name`/`org_name`/`contact_phone`。
