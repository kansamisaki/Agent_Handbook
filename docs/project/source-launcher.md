---
title: "本机启动与进程退出"
outline: false
---

# 本机启动与进程退出

完整文件：`scripts/dev.py`。共 66 行。此页由工程源码生成，不是省略实现的片段。

[返回源码目录](/project/source-index) · [下载整个工程](/downloads/ops-copilot.zip)

```python [dev.py]
#!/usr/bin/env python3
"""Explicit local-only development launcher; no browser, Docker or global services."""
from pathlib import Path
import os
import signal
import subprocess
import sys
import time
import httpx

root=Path(__file__).resolve().parents[1]
env=dict(os.environ)
if (root/'.env').exists():
    for line in (root/'.env').read_text().splitlines():
        line=line.strip()
        if line and not line.startswith('#'):
            key,sep,value=line.partition('=')
            if sep:env.setdefault(key.strip(),value.strip())
env.setdefault('COPILOT_DB',str(root/'var/copilot.db'))
env.setdefault('BUSINESS_DB_URL','jdbc:h2:file:'+str(root/'var/business')+';DB_CLOSE_ON_EXIT=FALSE')
api_port=env.get('API_PORT','18000');business_port=env.get('BUSINESS_PORT','18081')
env.setdefault('BUSINESS_URL','http://127.0.0.1:'+business_port)
env['PYTHONPATH']=str(root/'agent')
env['BIND_ADDRESS']='127.0.0.1';env['PORT']=business_port
(root/'var').mkdir(exist_ok=True)
jar=root/'business/target/copilot-business-2.0.0.jar'
if not jar.exists():
    if (root/'bin/copilot-business-2.0.0.jar').exists():jar=root/'bin/copilot-business-2.0.0.jar'
    else:subprocess.run(['mvn','-q','-DskipTests','package'],cwd=root/'business',check=True)
children=[]


def spawn(args):
    child=subprocess.Popen(args,cwd=root,env=env);children.append(child);return child


def wait_health(url,process):
    for _ in range(150):
        if process.poll() is not None:raise RuntimeError('service exited; see log above')
        try:
            if httpx.get(url+'/health',timeout=.5).status_code==200:return
        except httpx.HTTPError:pass
        time.sleep(.1)
    raise RuntimeError('startup timeout')


def terminate(signum,frame):
    raise KeyboardInterrupt


signal.signal(signal.SIGTERM,terminate)
try:
    java=spawn(['java','-jar',str(jar)]);wait_health('http://127.0.0.1:'+business_port,java)
    api=spawn([sys.executable,'-m','uvicorn','copilot.api:app','--host','127.0.0.1','--port',api_port])
    wait_health('http://127.0.0.1:'+api_port,api)
    spawn([sys.executable,'-m','copilot.worker'])
    print(f'\nAPI: http://127.0.0.1:{api_port}/docs\nRun: python scripts/demo.py\nCtrl+C closes all three local processes.',flush=True)
    while all(p.poll() is None for p in children):time.sleep(.5)
except KeyboardInterrupt:
    pass
finally:
    for p in reversed(children):
        if p.poll() is None:p.terminate()
    for p in children:
        try:p.wait(5)
        except subprocess.TimeoutExpired:p.kill();p.wait()
```
