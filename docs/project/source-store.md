---
title: "持久状态、租约与 fencing"
outline: false
---

# 持久状态、租约与 fencing

完整文件：`agent/copilot/store.py`。共 188 行。此页由工程源码生成，不是省略实现的片段。

[返回源码目录](/project/source-index) · [下载整个工程](/downloads/ops-copilot.zip)

```python [store.py]
"""Short SQLite transactions, fenced worker leases, append-only progress events.

Local reference: a single host / local disk. Do not put this SQLite file on NFS.
PostgreSQL production adaptation is documented separately and not silently emulated.
"""
from contextlib import contextmanager
from pathlib import Path
import json
import sqlite3
import time
import uuid
from . import config
from .contracts import canonical, digest


class Conflict(Exception):
    pass


class LostLease(Exception):
    pass


SCHEMA = '''
CREATE TABLE IF NOT EXISTS schema_version(version INTEGER PRIMARY KEY);
INSERT OR IGNORE INTO schema_version VALUES(1);
CREATE TABLE IF NOT EXISTS runs(
 id TEXT PRIMARY KEY, tenant TEXT NOT NULL, actor TEXT NOT NULL,
 request_key TEXT NOT NULL, request_hash TEXT NOT NULL, service_id TEXT NOT NULL,
 goal TEXT NOT NULL, status TEXT NOT NULL, state TEXT NOT NULL,
 steps INTEGER NOT NULL DEFAULT 0, max_steps INTEGER NOT NULL,
 attempts INTEGER NOT NULL DEFAULT 0, owner TEXT, lease_until REAL NOT NULL DEFAULT 0,
 fence INTEGER NOT NULL DEFAULT 0, available_at REAL NOT NULL DEFAULT 0, created REAL NOT NULL, deadline REAL NOT NULL,
 UNIQUE(tenant, actor, request_key));
CREATE INDEX IF NOT EXISTS runs_schedule ON runs(status, lease_until, created);
CREATE TABLE IF NOT EXISTS events(
 id INTEGER PRIMARY KEY AUTOINCREMENT, run_id TEXT NOT NULL,
 type TEXT NOT NULL, payload TEXT NOT NULL, created REAL NOT NULL);
CREATE INDEX IF NOT EXISTS events_run ON events(run_id,id);
CREATE TABLE IF NOT EXISTS memories(
 tenant TEXT, actor TEXT, scope TEXT, key TEXT, version INTEGER NOT NULL,
 value TEXT, source TEXT, occurred REAL NOT NULL, expires REAL NOT NULL,
 deleted INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(tenant,actor,scope,key));
CREATE TABLE IF NOT EXISTS memory_index(
 tenant TEXT, actor TEXT, scope TEXT, key TEXT, version INTEGER NOT NULL,
 search_text TEXT NOT NULL, PRIMARY KEY(tenant,actor,scope,key));
CREATE TABLE IF NOT EXISTS memory_outbox(
 id INTEGER PRIMARY KEY AUTOINCREMENT, tenant TEXT, actor TEXT, scope TEXT, key TEXT);
CREATE TABLE IF NOT EXISTS memory_audit(
 id INTEGER PRIMARY KEY AUTOINCREMENT, tenant TEXT, actor TEXT, scope TEXT, key TEXT,
 version INTEGER, operation TEXT, created REAL);
CREATE TABLE IF NOT EXISTS runbooks(
 id TEXT, version INTEGER, tenant TEXT, service_id TEXT, title TEXT,
 content TEXT, content_hash TEXT, active INTEGER, PRIMARY KEY(id,version,tenant));
'''


class Store:
    def __init__(self, path=None):
        self.path = str(path or config.DB_PATH)
        Path(self.path).parent.mkdir(parents=True, exist_ok=True)

    @contextmanager
    def db(self, write=False):
        conn = sqlite3.connect(self.path, timeout=5)
        conn.row_factory = sqlite3.Row
        conn.execute('PRAGMA busy_timeout=5000')
        try:
            if write:
                conn.execute('BEGIN IMMEDIATE')
            yield conn
            conn.commit()
        except BaseException:
            conn.rollback()
            raise
        finally:
            conn.close()

    def init(self):
        with self.db() as c:
            c.execute('PRAGMA journal_mode=WAL')
            c.executescript(SCHEMA)

    @staticmethod
    def decode(row):
        if row is None:
            return None
        result = dict(row)
        result['state'] = json.loads(result['state'])
        return result

    @staticmethod
    def event(c, run_id, kind, payload):
        c.execute('INSERT INTO events(run_id,type,payload,created) VALUES(?,?,?,?)',
                  (run_id, kind, canonical(payload), time.time()))

    def create(self, actor, request, key):
        request_hash = digest(request)
        with self.db(True) as c:
            old = c.execute('SELECT * FROM runs WHERE tenant=? AND actor=? AND request_key=?',
                            (actor.tenant, actor.user, key)).fetchone()
            if old:
                if old['request_hash'] != request_hash:
                    raise Conflict('idempotency_key_reused_with_different_request')
                return self.decode(old)
            run_id = str(uuid.uuid4())
            now = time.time()
            state = {'observations': {}, 'action_id': 'ticket:' + run_id,
                     'model_mode': config.MODEL_MODE, 'version': 'copilot-v2.0'}
            c.execute('''INSERT INTO runs(id,tenant,actor,request_key,request_hash,service_id,
                goal,status,state,max_steps,created,deadline) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)''',
                      (run_id, actor.tenant, actor.user, key, request_hash, request['service_id'],
                       request['goal'], 'queued', canonical(state), request['max_steps'], now, now + 900))
            self.event(c, run_id, 'created', {'status': 'queued'})
            return self.decode(c.execute('SELECT * FROM runs WHERE id=?', (run_id,)).fetchone())

    def get(self, run_id, actor=None):
        with self.db() as c:
            if actor:
                row = c.execute('SELECT * FROM runs WHERE id=? AND tenant=? AND actor=?',
                                (run_id, actor.tenant, actor.user)).fetchone()
            else:
                row = c.execute('SELECT * FROM runs WHERE id=?', (run_id,)).fetchone()
            return self.decode(row)

    def claim(self, owner, lease=None, now=None):
        now = time.time() if now is None else now
        lease = config.LEASE_SECONDS if lease is None else lease
        with self.db(True) as c:
            row = c.execute('''SELECT * FROM runs WHERE
                status IN ('queued','running','committing') AND lease_until < ? AND available_at <= ?
                ORDER BY created LIMIT 1''', (now,now)).fetchone()
            if row is None:
                return None
            status = 'committing' if row['status'] == 'committing' else 'running'
            c.execute('UPDATE runs SET owner=?,lease_until=?,fence=fence+1,status=? WHERE id=?',
                      (owner, now + lease, status, row['id']))
            self.event(c, row['id'], 'claimed', {'fence': row['fence'] + 1, 'status': status})
            return self.decode(c.execute('SELECT * FROM runs WHERE id=?', (row['id'],)).fetchone())

    def save(self, run, status, state, kind, payload, step=True, attempts=0, now=None, retry_delay=0):
        now = time.time() if now is None else now
        with self.db(True) as c:
            changed = c.execute('''UPDATE runs SET status=?,state=?,steps=steps+?,attempts=?,
                owner=NULL,lease_until=0,available_at=? WHERE id=? AND owner=? AND fence=?
                AND lease_until>=? AND status IN ('running','committing')''',
                (status, canonical(state), int(step), attempts, now+retry_delay, run['id'], run['owner'], run['fence'], now))
            if changed.rowcount != 1:
                raise LostLease(run['id'])
            self.event(c, run['id'], kind, payload)

    def decide(self, actor, run_id, args_hash, approve, approval):
        with self.db(True) as c:
            row = c.execute('SELECT * FROM runs WHERE id=? AND tenant=? AND actor=?',
                            (run_id, actor.tenant, actor.user)).fetchone()
            if not row:
                raise KeyError(run_id)
            state = json.loads(row['state'])
            if row['status'] != 'waiting_approval':
                raise Conflict('run_not_waiting_approval')
            if state['args_hash'] != args_hash:
                raise Conflict('approval_does_not_match_visible_draft')
            if time.time() > row['deadline']:
                raise Conflict('run_deadline_expired')
            if approve:
                state['approval'] = approval
            status = 'committing' if approve else 'cancelled'
            c.execute('UPDATE runs SET status=?,state=?,lease_until=0 WHERE id=?',
                      (status, canonical(state), run_id))
            self.event(c, run_id, 'approved' if approve else 'rejected', {'args_hash': args_hash})

    def cancel(self, actor, run_id):
        with self.db(True) as c:
            row = c.execute('SELECT status FROM runs WHERE id=? AND tenant=? AND actor=?',
                            (run_id, actor.tenant, actor.user)).fetchone()
            if not row:
                raise KeyError(run_id)
            # A commit might already have succeeded remotely: don't claim it was undone.
            if row['status'] not in ('queued', 'running', 'waiting_approval'):
                raise Conflict('cannot_cancel_commit_or_terminal_run')
            c.execute("UPDATE runs SET status='cancelled',fence=fence+1,owner=NULL,lease_until=0 WHERE id=?", (run_id,))
            self.event(c, run_id, 'cancelled', {})

    def events(self, run_id, after=0):
        with self.db() as c:
            rows = c.execute('SELECT * FROM events WHERE run_id=? AND id>? ORDER BY id LIMIT 100',
                             (run_id, after)).fetchall()
            return [{**dict(r), 'payload': json.loads(r['payload'])} for r in rows]
```
