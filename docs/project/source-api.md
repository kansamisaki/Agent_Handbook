---
title: "Python API、审批与 SSE"
outline: false
---

# Python API、审批与 SSE

完整文件：`agent/copilot/api.py`。共 150 行。此页由工程源码生成，不是省略实现的片段。

[返回源码目录](/project/source-index) · [下载整个工程](/downloads/ops-copilot.zip)

```python
from contextlib import asynccontextmanager
import json
import time
from fastapi import FastAPI, Depends, Header, HTTPException, Query
from fastapi.responses import StreamingResponse, PlainTextResponse
from . import config, knowledge
from .contracts import RunRequest, Approval, MemoryWrite, sign
from .store import Store, Conflict
from .memory import Memory

store = Store()


@asynccontextmanager
async def lifespan(app):
    store.init(); knowledge.ingest(store)
    yield


app = FastAPI(title='Ops Copilot · local reference', version='2.0.0', lifespan=lifespan)


def authenticate(authorization: str = Header(default='')):
    for actor in config.ACTORS:
        if authorization == 'Bearer ' + actor.token:
            return actor
    raise HTTPException(401, 'invalid_token')


def owned(run_id, actor):
    run = store.get(run_id, actor)
    if not run:
        raise HTTPException(404, 'run_not_found')
    return run


@app.exception_handler(Conflict)
async def conflict_handler(request, error):
    from fastapi.responses import JSONResponse
    return JSONResponse(status_code=409, content={'detail': str(error)})


@app.get('/health')
def health():
    with store.db() as c:
        c.execute('SELECT 1')
    return {'status': 'ok', 'model_mode': config.MODEL_MODE}


@app.post('/runs', status_code=202)
def create_run(request: RunRequest, actor=Depends(authenticate),
               idempotency_key: str = Header(min_length=1, max_length=100)):
    return public_run(store.create(actor, request.model_dump(), idempotency_key))


@app.get('/metrics', response_class=PlainTextResponse)
def metrics(actor=Depends(authenticate)):
    if actor.role != 'operator':
        raise HTTPException(403, 'operator_required')
    with store.db() as c:
        rows=c.execute('SELECT status,count(*) n FROM runs WHERE tenant=? GROUP BY status',(actor.tenant,)).fetchall()
        oldest=c.execute("SELECT min(created) FROM runs WHERE tenant=? AND status IN ('queued','running','committing')",(actor.tenant,)).fetchone()[0]
        pending=c.execute('SELECT count(*) FROM memory_outbox WHERE tenant=?',(actor.tenant,)).fetchone()[0]
    lines=['# TYPE copilot_runs gauge']+[f'copilot_runs{{status="{r["status"]}"}} {r["n"]}' for r in rows]
    lines += ['# TYPE copilot_oldest_pending_seconds gauge',
              f'copilot_oldest_pending_seconds {max(0,time.time()-oldest) if oldest else 0}',
              '# TYPE copilot_memory_outbox_pending gauge',f'copilot_memory_outbox_pending {pending}']
    return '\n'.join(lines)+'\n'


def public_run(run):
    result = {k: run[k] for k in ('id','service_id','status','steps','max_steps','attempts','created','deadline')}
    result['state'] = {k:v for k,v in run['state'].items() if k != 'approval'}
    return result


@app.get('/runs/{run_id}')
def get_run(run_id: str, actor=Depends(authenticate)):
    return public_run(owned(run_id, actor))


@app.post('/runs/{run_id}/decision')
def decide_run(run_id: str, body: Approval, actor=Depends(authenticate)):
    if actor.role != 'operator':
        raise HTTPException(403, 'operator_required')
    run = owned(run_id, actor)
    expires = int(time.time()) + 300
    approval = {'expires_at': expires, 'signature': sign(config.APPROVAL_SECRET, actor.tenant,
        actor.user, run['state']['action_id'], body.args_hash, expires)}
    store.decide(actor, run_id, body.args_hash, body.approve, approval)
    return public_run(owned(run_id, actor))


@app.post('/runs/{run_id}/cancel')
def cancel(run_id: str, actor=Depends(authenticate)):
    owned(run_id, actor)
    store.cancel(actor, run_id)
    return public_run(owned(run_id, actor))


@app.get('/runs/{run_id}/events')
def events(run_id: str, after: int = Query(default=0, ge=0),
           last_event_id: str | None = Header(default=None), actor=Depends(authenticate)):
    owned(run_id, actor)
    try:
        cursor = max(after, int(last_event_id or 0))
    except ValueError:
        raise HTTPException(400, 'invalid_last_event_id')
    def stream():
        nonlocal cursor
        # Bounded stream: client reconnects with Last-Event-ID. No auth token in query strings.
        for _ in range(30):
            for event in store.events(run_id, cursor):
                cursor = event['id']
                yield f"id: {cursor}\nevent: {event['type']}\ndata: {json.dumps(event, ensure_ascii=False)}\n\n"
            run = store.get(run_id, actor)
            if run['status'] not in ('queued','running','committing'):
                break
            yield ': heartbeat\n\n'
            time.sleep(.5)
    return StreamingResponse(stream(), media_type='text/event-stream',
                             headers={'Cache-Control':'no-cache','X-Accel-Buffering':'no'})


@app.put('/memories')
def put_memory(body: MemoryWrite, actor=Depends(authenticate)):
    try:
        return Memory(store).write(actor, body)
    except ValueError as e:
        raise HTTPException(422, str(e))


@app.get('/memories')
def get_memory(service: str = 'global', actor=Depends(authenticate)):
    return Memory(store).list(actor, service)


@app.get('/memories/search')
def search_memory(q: str = Query(min_length=1,max_length=100), service: str = 'global', actor=Depends(authenticate)):
    return Memory(store).search(actor, q, service)


@app.delete('/memories/{scope}/{key}')
def delete_memory(scope: str, key: str, expected_version: int = Query(ge=1), actor=Depends(authenticate)):
    return Memory(store).delete(actor, scope, key, expected_version)


@app.get('/memories/{scope}/{key}/version')
def memory_version(scope: str, key: str, actor=Depends(authenticate)):
    return Memory(store).version(actor, scope, key)
```
