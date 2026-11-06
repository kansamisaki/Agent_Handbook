---
title: "任务评测 CLI"
outline: false
---

# 任务评测 CLI

完整文件：`scripts/evaluate.py`。共 52 行。此页由工程源码生成，不是省略实现的片段。

[返回源码目录](/project/source-index) · [下载整个工程](/downloads/ops-copilot.zip)

```python [evaluate.py]
#!/usr/bin/env python3
"""Run pre-approval task checks against an explicitly started local service.

No automatic ticket approval. A quality report must separately assess diagnosis semantics.
"""
from pathlib import Path
import argparse
import datetime
import json
import math
import os
import time
import uuid
import httpx

root=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser()
p.add_argument('--base-url',default='http://127.0.0.1:18000')
p.add_argument('--output',default=str(root/'var/evaluation.json'))
args=p.parse_args()
cases=json.loads((root/'evals/cases.json').read_text())
results=[]
for case in cases:
    token=os.getenv(case['user'].upper()+'_TOKEN',case['user']+'-local-demo')
    started=time.monotonic();record={'id':case['id'],'group':case['group'],'passed':False}
    with httpx.Client(base_url=args.base_url,headers={'Authorization':'Bearer '+token},timeout=10) as client:
        try:
            response=client.post('/runs',headers={'Idempotency-Key':'eval-'+str(uuid.uuid4())},
                json={'service_id':case['service_id'],'goal':case['goal'],'max_steps':8})
            response.raise_for_status();rid=response.json()['id'];record['run_id']=rid
            while time.monotonic()-started<120:
                response=client.get('/runs/'+rid);response.raise_for_status();run=response.json()
                if run['status'] not in ('queued','running','committing'):break
                time.sleep(.2)
            record.update(status=run['status'],model_mode=run['state']['model_mode'])
            refs=run['state'].get('evidence_ids',[])
            isolated=all('beta' not in ref and ref!='rb-beta@1' for ref in refs) if case['user']=='alice' else True
            record['passed']=run['status']==case['expected_status'] and 'ticket' not in run['state'] and isolated
            if run['status']=='waiting_approval':
                client.post('/runs/'+rid+'/decision',json={'approve':False,'args_hash':run['state']['args_hash']}).raise_for_status()
        except (httpx.HTTPError,ValueError,KeyError) as e:
            record['error']=type(e).__name__
    record['seconds']=round(time.monotonic()-started,3);results.append(record)
n=len(results);k=sum(r['passed'] for r in results);z=1.96;phat=k/n;den=1+z*z/n
center=(phat+z*z/(2*n))/den;radius=z*math.sqrt(phat*(1-phat)/n+z*z/(4*n*n))/den
report={'time':datetime.datetime.now(datetime.timezone.utc).isoformat(),'successes':k,'samples':n,
 'wilson_95':[round(center-radius,4),round(center+radius,4)],'results':results,
 'scope':'Pre-approval state/identity checks only. No automatic submission or semantic expert scoring.',
 'warning':'Six synthetic cases cannot estimate production success; deterministic mode is not LLM quality.'}
dest=Path(args.output);dest.parent.mkdir(parents=True,exist_ok=True);dest.write_text(json.dumps(report,ensure_ascii=False,indent=2))
print(json.dumps({'successes':k,'samples':n,'report':str(dest)},ensure_ascii=False))
raise SystemExit(0 if k==n else 1)
```
