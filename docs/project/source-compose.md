---
title: "单机容器配置（未启动验证）"
outline: false
---

# 单机容器配置（未启动验证）

完整文件：`compose.yaml`。共 52 行。此页由工程源码生成，不是省略实现的片段。

[返回源码目录](/project/source-index) · [下载整个工程](/downloads/ops-copilot.zip)

```yaml
# Optional single-host teaching topology; not executed during authoring.
# SQLite/H2 local volumes deliberately constrain this profile to one host.
name: agent-book-copilot
x-agent: &agent
  build:
    context: .
    dockerfile: infra/Dockerfile.agent
  environment:
    BUSINESS_URL: http://business:8081
    ALICE_TOKEN: ${ALICE_TOKEN:-alice-local-demo}
    BOB_TOKEN: ${BOB_TOKEN:-bob-local-demo}
    VIEWER_TOKEN: ${VIEWER_TOKEN:-viewer-local-demo}
    APPROVAL_SECRET: ${APPROVAL_SECRET:-local-demo-change-before-deployment}
    MODEL_MODE: ${MODEL_MODE:-deterministic}
    MODEL_BASE_URL: ${MODEL_BASE_URL:-http://host.docker.internal:8001/v1}
    MODEL_NAME: ${MODEL_NAME:-configure-your-model}
    MODEL_API_KEY: ${MODEL_API_KEY:-}
  volumes:
    - agent-state:/data
  depends_on:
    business:
      condition: service_healthy
  restart: "no"
services:
  business:
    build:
      context: .
      dockerfile: infra/Dockerfile.business
    environment:
      ALICE_TOKEN: ${ALICE_TOKEN:-alice-local-demo}
      BOB_TOKEN: ${BOB_TOKEN:-bob-local-demo}
      VIEWER_TOKEN: ${VIEWER_TOKEN:-viewer-local-demo}
      APPROVAL_SECRET: ${APPROVAL_SECRET:-local-demo-change-before-deployment}
    volumes:
      - business-state:/data
    ports:
      - "127.0.0.1:18081:8081"
    healthcheck:
      test: ["CMD-SHELL", "bash -c '</dev/tcp/127.0.0.1/8081'"]
      interval: 5s
      timeout: 2s
      retries: 20
  api:
    <<: *agent
    ports:
      - "127.0.0.1:18000:8000"
  worker:
    <<: *agent
    command: ["python", "-m", "copilot.worker"]
volumes:
  agent-state:
  business-state:
```
