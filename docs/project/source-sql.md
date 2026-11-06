---
title: "Java 业务表结构"
outline: false
---

# Java 业务表结构

完整文件：`business/src/main/resources/schema.sql`。共 23 行。此页由工程源码生成，不是省略实现的片段。

[返回源码目录](/project/source-index) · [下载整个工程](/downloads/ops-copilot.zip)

```sql
CREATE TABLE IF NOT EXISTS services (
 tenant VARCHAR(80) NOT NULL,
 service_id VARCHAR(80) NOT NULL,
 service_version INTEGER NOT NULL,
 pool_wait_ms INTEGER NOT NULL,
 db_cpu_pct INTEGER NOT NULL,
 change_id VARCHAR(80) NOT NULL,
 change_description VARCHAR(1000) NOT NULL,
 PRIMARY KEY(tenant, service_id)
);
CREATE TABLE IF NOT EXISTS tickets (
 ticket_id VARCHAR(80) PRIMARY KEY,
 tenant VARCHAR(80) NOT NULL,
 actor VARCHAR(80) NOT NULL,
 action_id VARCHAR(100) NOT NULL,
 args_hash VARCHAR(64) NOT NULL,
 service_id VARCHAR(80) NOT NULL,
 title VARCHAR(300) NOT NULL,
 body VARCHAR(4000) NOT NULL,
 channel VARCHAR(30) NOT NULL,
 created_at BIGINT NOT NULL,
 UNIQUE(tenant, action_id)
);
```
