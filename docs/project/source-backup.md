---
title: "一致数据库快照"
outline: false
---

# 一致数据库快照

完整文件：`scripts/backup.py`。共 15 行。此页由工程源码生成，不是省略实现的片段。

[返回源码目录](/project/source-index) · [下载整个工程](/downloads/ops-copilot.zip)

```python
#!/usr/bin/env python3
"""Consistent SQLite snapshot through the backup API, including committed WAL pages."""
import argparse
from pathlib import Path
import sqlite3

p=argparse.ArgumentParser();p.add_argument('source');p.add_argument('destination');args=p.parse_args()
source=Path(args.source).resolve();destination=Path(args.destination).resolve()
if source==destination or destination.exists():raise SystemExit('Choose a new destination; backups never overwrite an existing file.')
if not source.exists():raise SystemExit('Source database is missing.')
destination.parent.mkdir(parents=True,exist_ok=True)
with sqlite3.connect(source.as_uri()+'?mode=ro',uri=True) as src,sqlite3.connect(destination) as dst:
    src.backup(dst)
    assert dst.execute('PRAGMA integrity_check').fetchone()[0]=='ok'
print('Snapshot verified:',destination)
```
