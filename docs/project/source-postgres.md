---
title: "PostgreSQL 适配设计（尚未实现）"
outline: false
---

# PostgreSQL 适配设计（尚未实现）

完整文件：`infra/postgres-queue.sql`。共 34 行。此页由工程源码生成，不是省略实现的片段。

[返回源码目录](/project/source-index) · [下载整个工程](/downloads/ops-copilot.zip)

```sql [postgres-queue.sql]
-- Design reference for a separate PostgreSQL adapter, NOT used by the SQLite executable.
-- Create with a migration role; runtime roles should have only required table privileges.
CREATE TABLE agent_run (
 id uuid PRIMARY KEY,
 tenant text NOT NULL,
 status text NOT NULL,
 state jsonb NOT NULL,
 owner uuid,
 fence bigint NOT NULL DEFAULT 0,
 lease_until timestamptz,
 available_at timestamptz NOT NULL DEFAULT now(),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX agent_run_ready ON agent_run (available_at,created_at)
 WHERE status IN ('queued','running','committing');

-- Bind :owner with a driver, don't substitute strings. Short transaction; no model call inside.
WITH candidate AS (
 SELECT id FROM agent_run
 WHERE status IN ('queued','running','committing')
   AND (lease_until IS NULL OR lease_until < clock_timestamp())
   AND available_at <= clock_timestamp()
 ORDER BY created_at
 FOR UPDATE SKIP LOCKED LIMIT 1
)
UPDATE agent_run r SET owner=:owner, fence=r.fence+1,
 lease_until=clock_timestamp()+interval '30 seconds',
 status=CASE WHEN r.status='committing' THEN 'committing' ELSE 'running' END
FROM candidate c WHERE r.id=c.id RETURNING r.*;

-- All completion and heartbeat writes must fence old owners too.
UPDATE agent_run SET state=:state, status=:next_status, owner=NULL, lease_until=NULL
WHERE id=:id AND owner=:owner AND fence=:fence AND lease_until>=clock_timestamp();
-- Require rowcount = 1; otherwise discard local results as a stale worker.
```
