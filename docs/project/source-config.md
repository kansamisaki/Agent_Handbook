---
title: "身份与运行配置"
outline: false
---

# 身份与运行配置

完整文件：`agent/copilot/config.py`。共 30 行。此页由工程源码生成，不是省略实现的片段。

[返回源码目录](/project/source-index) · [下载整个工程](/downloads/ops-copilot.zip)

```python
from dataclasses import dataclass
import os


@dataclass(frozen=True)
class Actor:
    tenant: str
    user: str
    role: str
    token: str


ACTORS = (
    Actor('acme', 'alice', 'operator', os.getenv('ALICE_TOKEN', 'alice-local-demo')),
    Actor('beta', 'bob', 'operator', os.getenv('BOB_TOKEN', 'bob-local-demo')),
    Actor('acme', 'viewer', 'viewer', os.getenv('VIEWER_TOKEN', 'viewer-local-demo')),
)
DB_PATH = os.getenv('COPILOT_DB', './var/copilot.db')
BUSINESS_URL = os.getenv('BUSINESS_URL', 'http://127.0.0.1:18081')
APPROVAL_SECRET = os.getenv('APPROVAL_SECRET', 'local-demo-change-before-deployment')
LEASE_SECONDS = float(os.getenv('LEASE_SECONDS', '30'))
HTTP_TIMEOUT = float(os.getenv('HTTP_TIMEOUT', '8'))
MODEL_MODE = os.getenv('MODEL_MODE', 'deterministic')
MODEL_BASE_URL = os.getenv('MODEL_BASE_URL', 'http://127.0.0.1:8001/v1')
MODEL_NAME = os.getenv('MODEL_NAME', 'configure-your-model')
MODEL_API_KEY = os.getenv('MODEL_API_KEY', '')


def actor_for(tenant: str, user: str) -> Actor:
    return next(a for a in ACTORS if (a.tenant, a.user) == (tenant, user))
```
