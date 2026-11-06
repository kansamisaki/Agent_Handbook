---
title: "Python Agent 执行器"
outline: false
---

# Python Agent 执行器

完整文件：`agent/copilot/worker.py`。共 140 行。此页由工程源码生成，不是省略实现的片段。

[返回源码目录](/project/source-index) · [下载整个工程](/downloads/ops-copilot.zip)

```python
import argparse
import json
import os
import random
import time
import uuid
import httpx
from . import config, knowledge, model
from .contracts import digest
from .memory import Memory
from .store import Store, LostLease


def log(event, run, **fields):
    print(json.dumps({'event': event, 'run_id': run['id'], 'tenant': run['tenant'],
                      'fence': run['fence'], **fields}, ensure_ascii=False), flush=True)


class Worker:
    def __init__(self, store, client=None, crash_after_ticket=False):
        self.store = store
        self.client = client or httpx.Client(timeout=config.HTTP_TIMEOUT)
        self.owner = str(uuid.uuid4())
        self.crash_after_ticket = crash_after_ticket

    def business(self, run, method, path, body=None):
        actor = config.actor_for(run['tenant'], run['actor'])
        response = self.client.request(method, config.BUSINESS_URL + path, json=body,
            headers={'Authorization': 'Bearer ' + actor.token, 'X-Run-Id': run['id']})
        response.raise_for_status()
        return response.json()

    def step(self, run):
        state = run['state']
        if run['status'] == 'committing':
            # Persisted action_id and signed, approved parameters survive a worker crash.
            result = self.business(run, 'POST', '/tickets', {'action_id': state['action_id'],
                'draft': state['draft'], 'approval': state['approval']})
            if self.crash_after_ticket:
                log('fault_after_business_commit', run, ticket_id=result['ticket_id'])
                os._exit(73)  # Explicit CLI fault mode; never enabled by API input.
            state['ticket'] = result
            self.store.save(run, 'succeeded', state, 'ticket_committed', result)
            return
        if time.time() > run['deadline']:
            self.store.save(run, 'failed', state, 'deadline_exceeded', {}, step=False)
            return
        if run['steps'] >= run['max_steps']:
            self.store.save(run, 'budget_exhausted', state, 'budget_exhausted', {}, step=False)
            return
        actor = config.actor_for(run['tenant'], run['actor'])
        memory = Memory(self.store).context(actor, run['service_id'])
        decision = model.decide(run, memory)
        if decision.kind == 'tool':
            name = decision.tool
            if name is None:
                raise ValueError('tool_name_required')
            if name in state['observations']:
                raise ValueError('repeated_tool_without_progress')
            if name == 'runbook':
                result = {'documents': knowledge.search(self.store, actor, run['service_id'])}
            else:
                result = self.business(run, 'GET', f"/services/{run['service_id']}/{name}")
            state['observations'][name] = result
            self.store.save(run, 'queued', state, 'tool_observed', {'tool': name})
        elif decision.kind == 'needs_input':
            state['answer'] = decision.diagnosis
            self.store.save(run, 'needs_input', state, 'needs_input', {'reason': decision.diagnosis})
        else:
            obs = state['observations']
            if not all(k in obs for k in ('metrics', 'runbook', 'changes')):
                raise ValueError('draft_missing_required_observations')
            docs = obs['runbook']['documents']
            known = {obs['metrics']['evidence_id'], obs['changes']['evidence_id'], *(d['evidence_id'] for d in docs)}
            if not docs or not decision.evidence_ids or not set(decision.evidence_ids) <= known:
                raise ValueError('draft_has_unobserved_or_missing_evidence')
            required_refs = {obs['metrics']['evidence_id'], obs['changes']['evidence_id']}
            if not required_refs <= set(decision.evidence_ids) or not any(d['evidence_id'] in decision.evidence_ids for d in docs):
                raise ValueError('draft_omits_required_evidence_types')
            channel = memory.get('notification_channel', {}).get('value', 'in_app')
            draft = {'service_id': run['service_id'], 'service_version': obs['metrics']['service_version'],
                     'title': f"调查 {run['service_id']} 告警", 'body': decision.diagnosis + '\n证据：' + ', '.join(decision.evidence_ids),
                     'channel': channel}
            state.update(draft=draft, args_hash=digest(draft), evidence_ids=decision.evidence_ids,
                         memory_versions={k: v['version'] for k, v in memory.items()})
            self.store.save(run, 'waiting_approval', state, 'draft_ready', {'args_hash': state['args_hash']})

    def once(self):
        Memory(self.store).drain()
        run = self.store.claim(self.owner)
        if not run:
            return False
        started = time.monotonic()
        try:
            self.step(run)
            log('step_finished', run, elapsed_ms=round((time.monotonic()-started)*1000))
        except LostLease:
            log('stale_worker_discarded', run)
        except Exception as e:
            retryable = isinstance(e, (httpx.TimeoutException, httpx.NetworkError)) or (
                isinstance(e, httpx.HTTPStatusError) and e.response.status_code >= 500)
            attempts = run['attempts'] + 1
            target = ('committing' if run['status'] == 'committing' else 'queued') if retryable and attempts < 3 else 'failed'
            if run['status'] == 'committing' and retryable and attempts >= 3:
                target = 'reconciliation_required'
            error = type(e).__name__
            # Never persist credentials or full upstream exception text.
            run['state']['last_error'] = error
            try:
                self.store.save(run, target, run['state'], 'step_error', {'error': error, 'retryable': retryable},
                                step=False, attempts=attempts,
                                retry_delay=random.uniform(.1, min(2 ** attempts, 8)) if retryable else 0)
            except LostLease:
                log('stale_worker_discarded', run)
            log('step_error', run, error=error, attempt=attempts)
        return True


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--once', action='store_true')
    parser.add_argument('--crash-after-ticket', action='store_true', help='local fault drill: exit 73 after remote commit')
    args = parser.parse_args()
    if config.LEASE_SECONDS <= config.HTTP_TIMEOUT * 2:
        raise SystemExit('LEASE_SECONDS must exceed 2 * HTTP_TIMEOUT (one model + one tool call per step).')
    store = Store(); store.init(); knowledge.ingest(store)
    worker = Worker(store, crash_after_ticket=args.crash_after_ticket)
    try:
        while True:
            worked = worker.once()
            if args.once:
                break
            if not worked:
                time.sleep(.2)
    finally:
        worker.client.close()


if __name__ == '__main__':
    main()
```
