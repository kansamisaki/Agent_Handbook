---
title: "Python 类型与摘要合同"
outline: false
---

# Python 类型与摘要合同

完整文件：`agent/copilot/contracts.py`。共 49 行。此页由工程源码生成，不是省略实现的片段。

[返回源码目录](/project/source-index) · [下载整个工程](/downloads/ops-copilot.zip)

```python [contracts.py]
import hashlib
import hmac
import json
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field


def canonical(value: dict) -> str:
    return json.dumps(value, sort_keys=True, ensure_ascii=False, separators=(',', ':'))


def digest(value: dict) -> str:
    return hashlib.sha256(canonical(value).encode()).hexdigest()


def sign(secret: str, tenant: str, actor: str, action_id: str, args_hash: str, expires: int) -> str:
    message = f'{tenant}|{actor}|{action_id}|{args_hash}|{expires}'
    return hmac.new(secret.encode(), message.encode(), hashlib.sha256).hexdigest()


class StrictModel(BaseModel):
    model_config = ConfigDict(extra='forbid')


class RunRequest(StrictModel):
    service_id: str = Field(pattern=r'^[a-z][a-z0-9-]{0,39}$')
    goal: str = Field(min_length=1, max_length=1000)
    max_steps: int = Field(default=8, ge=1, le=16)


class Decision(StrictModel):
    kind: Literal['tool', 'draft', 'needs_input']
    tool: Literal['metrics', 'runbook', 'changes'] | None = None
    diagnosis: str = Field(default='', max_length=2000)
    evidence_ids: list[str] = Field(default_factory=list, max_length=12)


class Approval(StrictModel):
    args_hash: str = Field(pattern=r'^[0-9a-f]{64}$')
    approve: bool


class MemoryWrite(StrictModel):
    scope: str = Field(default='global', pattern=r'^(global|payment|inventory)$')
    key: Literal['notification_channel', 'language']
    value: str = Field(max_length=30)
    expected_version: int = Field(ge=0)
    ttl_seconds: int = Field(default=86400, ge=1, le=2592000)
    occurred_at: float | None = None
```
