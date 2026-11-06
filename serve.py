#!/usr/bin/env python3
"""Serve the bundled static book locally. No package installation or network needed."""
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import argparse
import webbrowser
import threading

root=Path(__file__).resolve().parent
parser=argparse.ArgumentParser(description='本地阅读 Agent 工程手册')
parser.add_argument('--port',type=int,default=4173)
parser.add_argument('--no-open',action='store_true')
args=parser.parse_args()
directory=root/'docs/.vitepress/dist'
if not (directory/'index.html').exists():
    raise SystemExit('找不到构建产物，请先运行 npm ci && npm run build。')
handler=partial(SimpleHTTPRequestHandler,directory=str(directory))
server=ThreadingHTTPServer(('127.0.0.1',args.port),handler)
url=f'http://127.0.0.1:{args.port}/'
print(f'Agent 工程手册：{url}\n按 Ctrl+C 停止。仅监听本机，不会发布到互联网。',flush=True)
if not args.no_open:
    threading.Timer(.4,lambda:webbrowser.open(url)).start()
try:
    server.serve_forever()
except KeyboardInterrupt:
    print('\n已停止本地服务。')
finally:
    server.server_close()
