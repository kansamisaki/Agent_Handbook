---
title: "队列与 KV 容量估算"
outline: false
---

# 队列与 KV 容量估算

完整文件：`scripts/capacity.py`。共 21 行。此页由工程源码生成，不是省略实现的片段。

[返回源码目录](/project/source-index) · [下载整个工程](/downloads/ops-copilot.zip)

```python
#!/usr/bin/env python3
"""Transparent capacity model; estimates only, never substitutes for a benchmark."""
import argparse
import json
p=argparse.ArgumentParser()
p.add_argument('--arrival-rps',type=float,default=2)
p.add_argument('--mean-seconds',type=float,default=6)
p.add_argument('--utilization',type=float,default=.65)
p.add_argument('--layers',type=int,default=32)
p.add_argument('--kv-heads',type=int,default=8)
p.add_argument('--head-dim',type=int,default=128)
p.add_argument('--tokens',type=int,default=8192)
p.add_argument('--bytes-per-element',type=int,default=2)
a=p.parse_args()
if a.arrival_rps<0 or a.mean_seconds<=0 or not 0<a.utilization<1:raise SystemExit('Invalid queue inputs')
if min(a.layers,a.kv_heads,a.head_dim,a.tokens,a.bytes_per_element)<=0:raise SystemExit('Invalid KV inputs')
kv=2*a.layers*a.kv_heads*a.head_dim*a.tokens*a.bytes_per_element
print(json.dumps({'mean_inflight_little_law':a.arrival_rps*a.mean_seconds,
 'suggested_parallel_slots_estimate':__import__('math').ceil(a.arrival_rps*a.mean_seconds/a.utilization),
 'kv_gib_per_sequence_estimate':kv/1024**3,
 'excludes':'weights, activations, allocator, paging fragmentation, prefixes, and burst tails'},indent=2))
```
