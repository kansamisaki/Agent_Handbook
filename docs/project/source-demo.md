---
title: "端到端 CLI 演示"
outline: false
---

# 端到端 CLI 演示

完整文件：`scripts/demo.py`。共 32 行。此页由工程源码生成，不是省略实现的片段。

[返回源码目录](/project/source-index) · [下载整个工程](/downloads/ops-copilot.zip)

```python [demo.py]
#!/usr/bin/env python3
import argparse
import json
import os
import time
import uuid
import httpx

parser=argparse.ArgumentParser(description='Create a local diagnosis; --approve submits the displayed sample ticket.')
parser.add_argument('--approve',action='store_true')
parser.add_argument('--service',default='payment',choices=['payment','inventory'])
args=parser.parse_args()
base=os.getenv('COPILOT_URL','http://127.0.0.1:18000')
headers={'Authorization':'Bearer '+os.getenv('ALICE_TOKEN','alice-local-demo')}
with httpx.Client(base_url=base,headers=headers,timeout=10) as client:
    response=client.post('/runs',headers={'Idempotency-Key':str(uuid.uuid4())},
        json={'service_id':args.service,'goal':'诊断告警，准备有证据的工单','max_steps':8})
    response.raise_for_status();rid=response.json()['id']
    for _ in range(200):
        response=client.get('/runs/'+rid);response.raise_for_status();run=response.json()
        if run['status']=='waiting_approval':
            print(json.dumps(run['state']['draft'],ensure_ascii=False,indent=2))
            print('args_hash:',run['state']['args_hash'])
            if args.approve:
                client.post('/runs/'+rid+'/decision',json={'approve':True,'args_hash':run['state']['args_hash']}).raise_for_status()
                args.approve=False
            else:
                print('Draft only. Explicitly use --approve for the local sample business write.');break
        elif run['status'] not in ('queued','running','committing'):
            print(json.dumps(run,ensure_ascii=False,indent=2));break
        time.sleep(.2)
    else:raise SystemExit('Timeout: inspect the run and worker logs; no new action_id was generated.')
```
