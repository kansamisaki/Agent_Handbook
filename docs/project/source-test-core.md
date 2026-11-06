---
title: "核心不变量测试"
outline: false
---

# 核心不变量测试

完整文件：`agent/tests/test_core.py`。共 174 行。此页由工程源码生成，不是省略实现的片段。

[返回源码目录](/project/source-index) · [下载整个工程](/downloads/ops-copilot.zip)

```python
import time
from concurrent.futures import ThreadPoolExecutor
import httpx
import pytest
from pydantic import ValidationError
from copilot import config, knowledge, model
from copilot.contracts import MemoryWrite, Decision
from copilot.memory import Memory
from copilot.store import Store, Conflict, LostLease
from copilot.worker import Worker


@pytest.fixture
def store(tmp_path):
    s=Store(tmp_path/'state.db'); s.init(); knowledge.ingest(s)
    return s


ALICE=config.ACTORS[0]
BOB=config.ACTORS[1]
REQUEST={'service_id':'payment','goal':'diagnose alert','max_steps':8}


def preference(value='email', version=0, **kwargs):
    return MemoryWrite(key='notification_channel',value=value,expected_version=version,**kwargs)


def test_request_idempotency_and_conflict(store):
    first=store.create(ALICE,REQUEST,'req-1')
    assert first['id']==store.create(ALICE,REQUEST,'req-1')['id']
    with pytest.raises(Conflict):store.create(ALICE,{**REQUEST,'goal':'different'},'req-1')
    assert store.get(first['id'],BOB) is None


def test_two_workers_cannot_claim_same_live_run(store):
    store.create(ALICE,REQUEST,'req-1')
    with ThreadPoolExecutor(2) as pool:
        results=list(pool.map(lambda name:store.claim(name),['w1','w2']))
    assert sum(r is not None for r in results)==1


def test_fencing_rejects_stale_worker_and_keeps_action_id(store):
    original=store.create(ALICE,REQUEST,'req-1')
    now=time.time()
    old=store.claim('old',lease=1,now=now)
    new=store.claim('new',lease=10,now=now+2)
    assert old['state']['action_id']==new['state']['action_id']==original['state']['action_id']
    with pytest.raises(LostLease):store.save(old,'queued',old['state'],'invalid',{},now=now+2)
    store.save(new,'queued',new['state'],'valid',{},now=now+2)


def test_cancel_invalidates_inflight_lease(store):
    run=store.create(ALICE,REQUEST,'req-1'); claimed=store.claim('w')
    store.cancel(ALICE,run['id'])
    with pytest.raises(LostLease):store.save(claimed,'queued',claimed['state'],'invalid',{})
    assert store.get(run['id'])['status']=='cancelled'


def test_memory_compare_and_swap_and_late_event(store):
    m=Memory(store); now=time.time()
    m.write(ALICE,preference(occurred_at=now-10))
    with pytest.raises(Conflict):m.write(ALICE,preference('in_app',0))
    with pytest.raises(Conflict):m.write(ALICE,preference('in_app',1,occurred_at=now-20))
    assert m.write(ALICE,preference('in_app',1))['version']==2


def test_memory_scope_and_identity(store):
    m=Memory(store)
    m.write(ALICE,preference())
    m.write(ALICE,preference('in_app',scope='payment'))
    assert m.context(ALICE,'payment')['notification_channel']['value']=='in_app'
    assert m.context(ALICE,'inventory')['notification_channel']['value']=='email'
    assert m.list(BOB)==[]


def test_memory_expiry_is_checked_at_read(store):
    m=Memory(store);now=time.time()
    m.write(ALICE,preference(ttl_seconds=1),now=now)
    assert m.list(ALICE,now=now+.5)
    assert m.list(ALICE,now=now+2)==[]


def test_stale_index_cannot_return_replaced_value(store):
    m=Memory(store);m.write(ALICE,preference());m.drain()
    assert m.search(ALICE,'email')
    m.write(ALICE,preference('in_app',1))
    assert m.search(ALICE,'email')==[]
    assert m.search(ALICE,'in_app')==[] # Temporary miss until outbox is consumed.
    m.drain()
    assert m.search(ALICE,'in_app')[0]['version']==2


def test_delete_and_old_outbox_cannot_resurrect_memory(store):
    m=Memory(store);m.write(ALICE,preference());m.drain()
    m.write(ALICE,preference('in_app',1))
    m.delete(ALICE,'global','notification_channel',2)
    m.drain()
    assert m.list(ALICE)==[] and m.search(ALICE,'in_app')==[]
    with store.db() as c:
        row=c.execute('SELECT value,source,deleted,version FROM memories').fetchone()
        assert tuple(row)==(None,None,1,3)
    with pytest.raises(Conflict):m.write(ALICE,preference('email',0))


def test_memory_policy_rejects_arbitrary_secret_value(store):
    with pytest.raises(ValueError):Memory(store).write(ALICE,preference('password=secret'))


def test_explicit_recreation_keeps_tombstone_version_and_identity(store):
    m=Memory(store);m.write(ALICE,preference())
    m.delete(ALICE,'global','notification_channel',1)
    assert m.list(ALICE)==[]
    assert m.version(ALICE,'global','notification_channel')['version']==2
    assert m.version(BOB,'global','notification_channel')['version']==0
    m.write(ALICE,preference('in_app',2))
    assert m.context(ALICE,'payment')['notification_channel']['version']==3


def test_knowledge_has_version_and_tenant_boundary(store):
    a=knowledge.search(store,ALICE,'payment');b=knowledge.search(store,BOB,'payment')
    assert [d['evidence_id'] for d in a]==['rb-pool@2']
    assert [d['evidence_id'] for d in b]==['rb-beta@1']


@pytest.mark.parametrize('payload',[
    {'kind':'tool','tool':'shell'},
    {'kind':'tool','tool':'metrics','tenant':'beta'},
    {'kind':'commit','tool':None},
])
def test_model_schema_rejects_privilege_expansion(payload):
    with pytest.raises(ValidationError):Decision.model_validate(payload)


def test_real_http_adapter_parses_protocol(monkeypatch):
    monkeypatch.setattr(config,'MODEL_MODE','http')
    def handler(request):
        assert request.url.path.endswith('/chat/completions')
        return httpx.Response(200,json={'choices':[{'message':{'content':'{"kind":"tool","tool":"metrics"}'}}]})
    with httpx.Client(transport=httpx.MockTransport(handler)) as client:
        answer=model.decide({'goal':'x','service_id':'payment','state':{'observations':{}}},{},client)
    assert answer.tool=='metrics'


def test_step_budget_stops_without_business_call(store):
    r=store.create(ALICE,{**REQUEST,'max_steps':1},'req-1')
    with store.db(True) as c:c.execute('UPDATE runs SET steps=1 WHERE id=?',(r['id'],))
    Worker(store).once()
    assert store.get(r['id'])['status']=='budget_exhausted'


def test_repeated_tool_stops_without_loop(store,monkeypatch):
    r=store.create(ALICE,REQUEST,'req-1')
    claimed=store.claim('seed');claimed['state']['observations']['metrics']={}
    store.save(claimed,'queued',claimed['state'],'seed',{})
    monkeypatch.setattr(model,'decide',lambda *args:Decision(kind='tool',tool='metrics'))
    Worker(store).once()
    assert store.get(r['id'])['status']=='failed'


def test_draft_cannot_cite_fabricated_evidence(store,monkeypatch):
    r=store.create(ALICE,REQUEST,'req-1')
    monkeypatch.setattr(model,'decide',lambda *args:Decision(kind='draft',diagnosis='wrong',evidence_ids=['made-up']))
    Worker(store).once()
    assert store.get(r['id'])['status']=='failed'


def test_sqlite_backup_preserves_committed_run(store,tmp_path):
    import subprocess,sys,sqlite3
    from pathlib import Path
    run=store.create(ALICE,REQUEST,'backup-case')
    destination=tmp_path/'snapshot.db'
    subprocess.run([sys.executable,str(Path(__file__).resolve().parents[2]/'scripts/backup.py'),store.path,str(destination)],check=True)
    with sqlite3.connect(destination) as conn:
        assert conn.execute('SELECT id FROM runs').fetchone()[0]==run['id']
```
