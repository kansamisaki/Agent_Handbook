---
title: "知识摄入与版本过滤"
outline: false
---

# 知识摄入与版本过滤

完整文件：`agent/copilot/knowledge.py`。共 32 行。此页由工程源码生成，不是省略实现的片段。

[返回源码目录](/project/source-index) · [下载整个工程](/downloads/ops-copilot.zip)

```python
import hashlib
import json
from pathlib import Path


def ingest(store, path=None):
    path = path or Path(__file__).with_name('runbooks.json')
    documents = json.loads(Path(path).read_text())
    with store.db(True) as c:
        for d in documents:
            required = {'id', 'version', 'tenant', 'service_id', 'title', 'content'}
            if set(d) != required or not d['content'].strip():
                raise ValueError('invalid_runbook_contract')
            sha = hashlib.sha256(d['content'].encode()).hexdigest()
            old = c.execute('SELECT content_hash FROM runbooks WHERE id=? AND version=? AND tenant=?',
                            (d['id'], d['version'], d['tenant'])).fetchone()
            if old and old['content_hash'] != sha:
                raise ValueError('same_document_version_changed')
            # Latest numeric version wins, independent of import order.
            c.execute('INSERT OR IGNORE INTO runbooks VALUES(?,?,?,?,?,?,?,0)',
                      (d['id'], d['version'], d['tenant'], d['service_id'], d['title'], d['content'], sha))
            latest = c.execute('SELECT max(version) FROM runbooks WHERE id=? AND tenant=?', (d['id'], d['tenant'])).fetchone()[0]
            c.execute('UPDATE runbooks SET active=(version=?) WHERE id=? AND tenant=?', (latest, d['id'], d['tenant']))
    return len(documents)


def search(store, actor, service):
    with store.db() as c:
        rows = c.execute('''SELECT id,version,title,content,content_hash FROM runbooks
            WHERE tenant=? AND service_id=? AND active=1 ORDER BY id LIMIT 4''',
                         (actor.tenant, service)).fetchall()
    return [{'evidence_id': f"{r['id']}@{r['version']}", **dict(r)} for r in rows]
```
