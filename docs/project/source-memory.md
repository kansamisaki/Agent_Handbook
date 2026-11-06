---
title: "Memory 事实、版本与索引"
outline: false
---

# Memory 事实、版本与索引

完整文件：`agent/copilot/memory.py`。共 98 行。此页由工程源码生成，不是省略实现的片段。

[返回源码目录](/project/source-index) · [下载整个工程](/downloads/ops-copilot.zip)

```python [memory.py]
"""Explicit preferences with CAS versions, expiry, tombstones and an outbox index."""
import time
import uuid
from .store import Conflict


class Memory:
    def __init__(self, store):
        self.store = store

    def write(self, actor, req, now=None):
        now = time.time() if now is None else now
        allowed = {'notification_channel': {'email', 'in_app'}, 'language': {'zh', 'en'}}
        if req.value not in allowed[req.key]:
            raise ValueError('memory_value_not_allowed')
        occurred = now if req.occurred_at is None else req.occurred_at
        if occurred > now + 30:
            raise ValueError('future_memory_event')
        identity = (actor.tenant, actor.user, req.scope, req.key)
        with self.store.db(True) as c:
            old = c.execute('SELECT * FROM memories WHERE tenant=? AND actor=? AND scope=? AND key=?', identity).fetchone()
            version = old['version'] if old else 0
            if version != req.expected_version:
                raise Conflict('memory_version_conflict')
            if old and occurred <= old['occurred']:
                raise Conflict('late_memory_event')
            version += 1
            source = 'explicit-api:' + str(uuid.uuid4())
            c.execute('''INSERT INTO memories VALUES(?,?,?,?,?,?,?,?,?,0)
                ON CONFLICT(tenant,actor,scope,key) DO UPDATE SET version=excluded.version,
                value=excluded.value,source=excluded.source,occurred=excluded.occurred,
                expires=excluded.expires,deleted=0''',
                (*identity, version, req.value, source, occurred, now + req.ttl_seconds))
            c.execute('INSERT INTO memory_outbox(tenant,actor,scope,key) VALUES(?,?,?,?)', identity)
            c.execute('INSERT INTO memory_audit(tenant,actor,scope,key,version,operation,created) VALUES(?,?,?,?,?,?,?)',
                      (*identity, version, 'write', now))
            return {'version': version, 'source': source, 'expires': now + req.ttl_seconds}

    def delete(self, actor, scope, key, version):
        identity = (actor.tenant, actor.user, scope, key)
        with self.store.db(True) as c:
            changed = c.execute('''UPDATE memories SET value=NULL,source=NULL,deleted=1,
                version=version+1,occurred=? WHERE tenant=? AND actor=? AND scope=? AND key=? AND version=?''',
                (time.time(), *identity, version))
            if changed.rowcount != 1:
                raise Conflict('memory_version_conflict')
            # Delete this local derivative synchronously; queued stale updates read current truth.
            c.execute('DELETE FROM memory_index WHERE tenant=? AND actor=? AND scope=? AND key=?', identity)
            c.execute('INSERT INTO memory_outbox(tenant,actor,scope,key) VALUES(?,?,?,?)', identity)
            c.execute('INSERT INTO memory_audit(tenant,actor,scope,key,version,operation,created) VALUES(?,?,?,?,?,?,?)',
                      (*identity, version + 1, 'delete', time.time()))
            return {'version': version + 1, 'deleted': True}

    def list(self, actor, service='global', now=None):
        now = time.time() if now is None else now
        with self.store.db() as c:
            rows = c.execute('''SELECT scope,key,value,version,source,expires FROM memories
                WHERE tenant=? AND actor=? AND scope IN ('global',?) AND deleted=0 AND expires>?
                ORDER BY CASE WHEN scope='global' THEN 0 ELSE 1 END''',
                (actor.tenant, actor.user, service, now)).fetchall()
            return [dict(r) for r in rows]

    def context(self, actor, service):
        # Specific service overrides global preference; values never grant permissions.
        return {r['key']: r for r in self.list(actor, service)}

    def version(self, actor, scope, key):
        # A new client can explicitly recreate an expired/deleted slot without resetting CAS.
        with self.store.db() as c:
            row=c.execute('SELECT version,deleted,expires FROM memories WHERE tenant=? AND actor=? AND scope=? AND key=?',
                          (actor.tenant,actor.user,scope,key)).fetchone()
            return {'version':row['version'],'deleted':bool(row['deleted']),'expired':row['expires']<=time.time()} if row else {
                'version':0,'deleted':False,'expired':False}

    def drain(self, limit=100):
        with self.store.db(True) as c:
            rows = c.execute('SELECT * FROM memory_outbox ORDER BY id LIMIT ?', (limit,)).fetchall()
            for row in rows:
                identity = tuple(row[k] for k in ('tenant', 'actor', 'scope', 'key'))
                current = c.execute('SELECT * FROM memories WHERE tenant=? AND actor=? AND scope=? AND key=?', identity).fetchone()
                c.execute('DELETE FROM memory_index WHERE tenant=? AND actor=? AND scope=? AND key=?', identity)
                if current and not current['deleted'] and current['expires'] > time.time():
                    c.execute('INSERT INTO memory_index VALUES(?,?,?,?,?,?)',
                              (*identity, current['version'], current['key'] + ' ' + current['value']))
                c.execute('DELETE FROM memory_outbox WHERE id=?', (row['id'],))
            return len(rows)

    def search(self, actor, query, service='global', now=None):
        now = time.time() if now is None else now
        with self.store.db() as c:
            # LIKE is a deliberately small lexical baseline, not an embedding/vector engine.
            rows = c.execute('''SELECT m.scope,m.key,m.value,m.version,m.source FROM memory_index i
                JOIN memories m ON m.tenant=i.tenant AND m.actor=i.actor AND m.scope=i.scope
                AND m.key=i.key AND m.version=i.version
                WHERE m.tenant=? AND m.actor=? AND m.scope IN ('global',?)
                AND m.deleted=0 AND m.expires>? AND instr(i.search_text,?)>0 LIMIT 8''',
                (actor.tenant, actor.user, service, now, query)).fetchall()
            return [dict(r) for r in rows]
```
