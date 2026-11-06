---
title: "真实 HTTP 与崩溃恢复测试"
outline: false
---

# 真实 HTTP 与崩溃恢复测试

完整文件：`agent/tests/test_integration.py`。共 218 行。此页由工程源码生成，不是省略实现的片段。

[返回源码目录](/project/source-index) · [下载整个工程](/downloads/ops-copilot.zip)

```python
"""Real HTTP, Java/H2 and Python/SQLite. Every spawned process is reaped in finally."""
from concurrent.futures import ThreadPoolExecutor
from contextlib import contextmanager
from pathlib import Path
import json
import os
import socket
import subprocess
import sys
import time
import uuid
import httpx
import pytest
from copilot.contracts import digest, sign

pytestmark=pytest.mark.skipif(os.getenv('RUN_JAVA_INTEGRATION')!='1',reason='Use scripts/check.py to build Java and run the complete suite')
ROOT=Path(__file__).resolve().parents[2]
TOKENS={'alice':'alice-local-demo','bob':'bob-local-demo','viewer':'viewer-local-demo'}
SECRET='test-only-approval-secret'


def free_port():
    with socket.socket() as sock:
        sock.bind(('127.0.0.1',0));return sock.getsockname()[1]


def auth(user='alice'):
    return {'Authorization':'Bearer '+TOKENS[user]}


def stop(process):
    if process.poll() is None:
        process.terminate()
        try:process.wait(5)
        except subprocess.TimeoutExpired:process.kill();process.wait(5)


def ready(url,process):
    for _ in range(120):
        if process.poll() is not None:raise AssertionError(f'process exited: {process.returncode}')
        try:
            if httpx.get(url+'/health',timeout=.5).status_code==200:return
        except httpx.HTTPError:pass
        time.sleep(.1)
    raise AssertionError('service startup timeout')


@pytest.fixture(scope='module')
def java(tmp_path_factory):
    temp=tmp_path_factory.mktemp('java-business');port=free_port()
    env={**os.environ,'PORT':str(port),'BIND_ADDRESS':'127.0.0.1',
         'BUSINESS_DB_URL':'jdbc:h2:file:'+str(temp/'business'),'APPROVAL_SECRET':SECRET,
         'ALICE_TOKEN':TOKENS['alice'],'BOB_TOKEN':TOKENS['bob'],'VIEWER_TOKEN':TOKENS['viewer']}
    with (temp/'java.log').open('w') as log:
        process=subprocess.Popen(['java','-jar',str(ROOT/'business/target/copilot-business-2.0.0.jar')],cwd=temp,env=env,stdout=log,stderr=log)
        try:
            url=f'http://127.0.0.1:{port}';ready(url,process);yield url
        finally:stop(process)


@pytest.fixture
def api(java,tmp_path):
    port=free_port();env={**os.environ,'COPILOT_DB':str(tmp_path/'agent.db'),'BUSINESS_URL':java,
        'PYTHONPATH':str(ROOT/'agent'),'APPROVAL_SECRET':SECRET,'MODEL_MODE':'deterministic',
        'LEASE_SECONDS':'3','HTTP_TIMEOUT':'1','ALICE_TOKEN':TOKENS['alice'],
        'BOB_TOKEN':TOKENS['bob'],'VIEWER_TOKEN':TOKENS['viewer']}
    log=(tmp_path/'api.log').open('w')
    process=subprocess.Popen([sys.executable,'-m','uvicorn','copilot.api:app','--host','127.0.0.1','--port',str(port)],
        cwd=ROOT/'agent',env=env,stdout=log,stderr=log)
    workers=[]
    def worker(crash=False):
        args=[sys.executable,'-m','copilot.worker']+(['--crash-after-ticket'] if crash else [])
        p=subprocess.Popen(args,cwd=ROOT/'agent',env=env,stdout=log,stderr=log);workers.append(p);return p
    try:
        url=f'http://127.0.0.1:{port}';ready(url,process)
        yield url,worker,{'db':str(tmp_path/'agent.db')}
    finally:
        for w in workers:stop(w)
        stop(process);log.close()


def new_run(url,service='payment',user='alice',steps=8):
    response=httpx.post(url+'/runs',headers={**auth(user),'Idempotency-Key':str(uuid.uuid4())},
                        json={'service_id':service,'goal':'诊断告警并准备工单','max_steps':steps})
    response.raise_for_status();return response.json()['id']


def wait_run(url,run_id,status,user='alice'):
    latest=None
    for _ in range(150):
        response=httpx.get(url+'/runs/'+run_id,headers=auth(user));response.raise_for_status();latest=response.json()
        if latest['status']==status:return latest
        if latest['status'] in ('failed','cancelled','budget_exhausted','reconciliation_required') and status!=latest['status']:
            raise AssertionError(latest)
        time.sleep(.1)
    raise AssertionError(latest)


def test_full_business_workflow_and_event_replay(api,java):
    url,worker,_=api;worker()
    httpx.put(url+'/memories',headers=auth(),json={'key':'notification_channel','value':'email','expected_version':0}).raise_for_status()
    rid=new_run(url);run=wait_run(url,rid,'waiting_approval')
    assert run['state']['draft']['channel']=='email'
    assert len(run['state']['evidence_ids'])==3
    assert httpx.get(url+'/runs/'+rid,headers=auth('bob')).status_code==404
    assert httpx.post(url+'/runs/'+rid+'/decision',headers=auth(),json={'approve':True,'args_hash':'0'*64}).status_code==409
    response=httpx.post(url+'/runs/'+rid+'/decision',headers=auth(),json={'approve':True,'args_hash':run['state']['args_hash']})
    response.raise_for_status();done=wait_run(url,rid,'succeeded')
    tickets=httpx.get(java+'/tickets',headers=auth()).json()
    assert done['state']['ticket']['ticket_id'] in {t['ticket_id'] for t in tickets}
    event_text=httpx.get(url+'/runs/'+rid+'/events',headers=auth()).text
    ids=[int(line[4:]) for line in event_text.splitlines() if line.startswith('id: ')]
    replay=httpx.get(url+'/runs/'+rid+'/events',headers={**auth(),'Last-Event-ID':str(ids[-2])}).text
    assert f'id: {ids[-1]}' in replay and f'id: {ids[-2]}\n' not in replay
    metrics=httpx.get(url+'/metrics',headers=auth())
    assert metrics.status_code==200 and 'copilot_runs{status="succeeded"} 1' in metrics.text
    assert httpx.get(url+'/metrics',headers=auth('viewer')).status_code==403
    meta=httpx.get(url+'/memories/global/notification_channel/version',headers=auth()).json()
    assert meta['version']==1 and not meta['deleted']


def test_crash_after_java_commit_recovers_one_ticket(api,java):
    url,worker,_=api;first=worker(crash=True)
    rid=new_run(url);draft=wait_run(url,rid,'waiting_approval')
    httpx.post(url+'/runs/'+rid+'/decision',headers=auth(),json={'approve':True,'args_hash':draft['state']['args_hash']}).raise_for_status()
    assert first.wait(10)==73
    assert httpx.get(url+'/runs/'+rid,headers=auth()).json()['status']=='committing'
    before=[t for t in httpx.get(java+'/tickets',headers=auth()).json() if t['action_id']=='ticket:'+rid]
    assert len(before)==1
    worker();done=wait_run(url,rid,'succeeded')
    after=[t for t in httpx.get(java+'/tickets',headers=auth()).json() if t['action_id']=='ticket:'+rid]
    assert len(after)==1 and done['state']['ticket']['ticket_id']==before[0]['ticket_id']
    assert done['state']['ticket']['replayed'] is True


@pytest.mark.parametrize('service,user',[('inventory','alice'),('payment','bob')])
def test_no_evidence_or_healthy_service_does_not_submit(api,service,user):
    url,worker,_=api;worker();rid=new_run(url,service,user)
    run=wait_run(url,rid,'needs_input',user)
    assert 'ticket' not in run['state'] and 'draft' not in run['state']


def test_viewer_cannot_approve(api):
    url,worker,_=api;worker();rid=new_run(url,user='viewer');run=wait_run(url,rid,'waiting_approval','viewer')
    response=httpx.post(url+'/runs/'+rid+'/decision',headers=auth('viewer'),json={'approve':True,'args_hash':run['state']['args_hash']})
    assert response.status_code==403


def ticket_request(version=3,expires=None):
    draft={'service_id':'payment','service_version':version,'title':'调查 payment 告警',
           'body':'疑似连接池配置变更。\n证据：metric:acme:payment:3, rb-pool@2, chg-104','channel':'in_app'}
    action='ticket:'+str(uuid.uuid4());expires=expires or int(time.time())+300
    return {'action_id':action,'draft':draft,'approval':{'expires_at':expires,
        'signature':sign(SECRET,'acme','alice',action,digest(draft),expires)}}


def test_java_concurrent_duplicate_commits_have_one_business_effect(java):
    body=ticket_request()
    def submit(_):
        response=httpx.post(java+'/tickets',headers=auth(),json=body);response.raise_for_status();return response.json()
    with ThreadPoolExecutor(4) as pool:results=list(pool.map(submit,range(4)))
    assert len({r['ticket_id'] for r in results})==1
    assert sum(not r['replayed'] for r in results)==1
    rows=[t for t in httpx.get(java+'/tickets',headers=auth()).json() if t['action_id']==body['action_id']]
    assert len(rows)==1


def test_java_rejects_unsigned_stale_and_expired_writes(java):
    body=ticket_request();body['approval']['signature']='0'*64
    assert httpx.post(java+'/tickets',headers=auth(),json=body).status_code==403
    assert httpx.post(java+'/tickets',headers=auth(),json=ticket_request(version=2)).status_code==409
    assert httpx.post(java+'/tickets',headers=auth(),json=ticket_request(expires=int(time.time())-10)).status_code==409


def test_java_idempotency_key_cannot_change_payload(java):
    body=ticket_request();httpx.post(java+'/tickets',headers=auth(),json=body).raise_for_status()
    body['draft']['title']='Different business intent'
    body['approval']['signature']=sign(SECRET,'acme','alice',body['action_id'],digest(body['draft']),body['approval']['expires_at'])
    assert httpx.post(java+'/tickets',headers=auth(),json=body).status_code==409


def test_java_tenant_metrics_are_isolated(java):
    a=httpx.get(java+'/services/payment/metrics',headers=auth()).json()
    b=httpx.get(java+'/services/payment/metrics',headers=auth('bob')).json()
    assert a['pool_wait_ms']==1200 and b['pool_wait_ms']==12
    assert httpx.get(java+'/services/inventory/metrics',headers=auth('bob')).status_code==404


def test_java_rejects_extra_identity_fields(java):
    body=ticket_request();body['tenant']='beta'
    assert httpx.post(java+'/tickets',headers=auth(),json=body).status_code==400


def test_task_evaluation_cli(api,tmp_path):
    url,worker,_=api;worker()
    output=tmp_path/'evaluation.json'
    subprocess.run([sys.executable,str(ROOT/'scripts/evaluate.py'),'--base-url',url,'--output',str(output)],check=True)
    report=json.loads(output.read_text())
    assert report['successes']==report['samples']==6
    (ROOT/'docs/evaluation-baseline.json').write_text(output.read_text())


def test_local_launcher_and_demo_cli(tmp_path):
    ap=free_port();bp=free_port();url=f'http://127.0.0.1:{ap}'
    env={**os.environ,'API_PORT':str(ap),'BUSINESS_PORT':str(bp),'COPILOT_URL':url,
         'BUSINESS_URL':f'http://127.0.0.1:{bp}','COPILOT_DB':str(tmp_path/'agent.db'),
         'BUSINESS_DB_URL':'jdbc:h2:file:'+str(tmp_path/'business'),
         'MODEL_MODE':'deterministic','APPROVAL_SECRET':SECRET,'ALICE_TOKEN':TOKENS['alice']}
    with (tmp_path/'launcher.log').open('w') as log:
        process=subprocess.Popen([sys.executable,str(ROOT/'scripts/dev.py')],cwd=ROOT,env=env,stdout=log,stderr=log)
        try:
            ready(url,process)
            result=subprocess.run([sys.executable,str(ROOT/'scripts/demo.py'),'--approve'],cwd=ROOT,env=env,
                                  capture_output=True,text=True,timeout=20)
            assert result.returncode==0,result.stderr
            assert '"status": "succeeded"' in result.stdout
        finally:stop(process)
    with pytest.raises(httpx.HTTPError):httpx.get(url+'/health',timeout=.5)
```
