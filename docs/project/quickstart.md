---
title: 本机运行：Python 与 Java 完整闭环
---

# 本机运行：Python 与 Java 完整闭环

下载[项目压缩包](/downloads/ops-copilot.zip)，解压后进入 `ops-copilot`。这里的命令由你按需执行；不需要 Docker，也不要求启动 Redis、PostgreSQL 或桌面应用。服务仅在本机监听，Ctrl+C 会关闭启动器创建的三个子进程。

## 1. 安装和启动

使用 Python 3.11+ 与 JDK 17+。交付验证环境为 Python 3.13 和 JDK 17。重新构建 Java 需要 Maven 3.6.3+；包中包含已构建 JAR，可用于首次阅读和演示。

```sh
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r agent/requirements.lock
python scripts/dev.py
```

Python 依赖安装在项目虚拟环境里。Java 依赖由 Maven 锁在项目 POM 的 Spring Boot 版本体系中；不要因为本机还安装了旧 Java 就随意修改父版本。若 `java -version` 低于 17，先选择正确 JDK，再构建。

启动器依次检查 Java `/health`、Python `/health`，确认就绪后启动 Worker。它不自动打开浏览器。你可以自行访问 `http://127.0.0.1:18000/docs` 阅读完整 API 合同。

## 2. 第一次只生成草案

另开终端，进入项目并激活虚拟环境：

```sh
source .venv/bin/activate
python scripts/demo.py
```

输出应包括服务 `payment`、疑似连接池配置变更、三类证据以及 64 位十六进制 `args_hash`。任务停在 `waiting_approval`。此时 Java 工单库不会因为模型生成了文字就新增记录。

运行 `python scripts/demo.py --approve` 会创建一个新的 run，打印它的具体草案，再提交本地示例工单。这个参数是对该次演示的显式批准，不会批准上一次命令留下的 run。正常终态为 `succeeded`，结果中有 `T-...` 工单 ID。

`python scripts/demo.py --service inventory` 则应进入 `needs_input`：异常指标存在，但运行手册缺失。这个反例用于验证系统不会因为“任务要求建单”就绕过证据要求。

## 3. 不用演示脚本，直接调用 API

```sh
curl -s http://127.0.0.1:18000/runs \
  -H 'Authorization: Bearer alice-local-demo' \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: exercise-001' \
  -d '{"service_id":"payment","goal":"诊断支付告警并准备工单","max_steps":8}'
```

保存返回的 `id`。相同身份、相同 Idempotency-Key 和相同内容重复提交会返回同一个 run；同 key 配不同内容返回 409。这个约束防止网络超时后用户重试产生两个独立工作流。

```sh
curl -s http://127.0.0.1:18000/runs/RUN_ID \
  -H 'Authorization: Bearer alice-local-demo'
curl -N http://127.0.0.1:18000/runs/RUN_ID/events \
  -H 'Authorization: Bearer alice-local-demo'
```

把 `RUN_ID` 替换成真实值。事件中可以看到 created、claimed、tool_observed、draft_ready。每个事件都有数据库序号；重连时传 `Last-Event-ID`，服务只返回之后的事件。示例 SSE 每次最多保持约 15 秒，客户端按游标重连，避免无限占用线程。

审批前完整读取草案，随后提交该草案的真实 hash：

```sh
curl -s http://127.0.0.1:18000/runs/RUN_ID/decision \
  -H 'Authorization: Bearer alice-local-demo' \
  -H 'Content-Type: application/json' \
  -d '{"approve":true,"args_hash":"REPLACE_WITH_REAL_HASH"}'
```

示例中的 hash 占位符不能原样使用。拒绝批准则把 `approve` 改为 false，任务进入 `cancelled`。已经进入 committing 的任务不接受“取消即撤销”的假承诺：它可能已在 Java 端提交，需要查询和对账。

## 4. 做一次 Memory 实验

```sh
curl -s -X PUT http://127.0.0.1:18000/memories \
  -H 'Authorization: Bearer alice-local-demo' \
  -H 'Content-Type: application/json' \
  -d '{"scope":"global","key":"notification_channel","value":"email","expected_version":0}'
```

新建任务的草案将采用 email 字段。本项目不会实际发送邮件。随后用 `expected_version:1` 更正为 `in_app`，再新建任务检查值已经变化。若重复执行本节，应先 GET `/memories` 读取当前版本，不要机械写 0。

删除需要 DELETE `/memories/global/notification_channel?expected_version=当前版本`。删除后 GET 和索引搜索都不再返回该偏好；已经批准并形成业务记录的工单不会因此被修改。这体现“删除记忆”与“修改历史业务事实”的职责差异。

如果偏好已经过期或删除，GET `/memories/global/notification_channel/version` 仍可读取本人槽位的版本元数据。之后用该版本重新显式写入，而不是假设记录不存在就把 expected_version 重置为 0。

## 5. 运行完整测试和阅读证据

```sh
python scripts/check.py
```

测试在随机本地端口启动真实 Java 和 Python 服务，数据库放在临时目录，与 `var/` 中你的演示数据分开。关键故障测试让 Worker 在 Java 返回后调用 `os._exit(73)`，再启动一个新 Worker，验证工单数量仍为一。

所有测试子进程都由 finally 清理。输出 `docs/test-report.json` 记录时间、环境、用例与未执行范围。把“模型适配器通过协议测试”和“真实模型在业务任务上达到成功率目标”分开理解，后者仍需要任务集与实际模型运行。

## 6. 换真实模型时发生什么

复制 `.env.example` 为 `.env`，将 `MODEL_MODE` 改为 `http`，填写兼容 Chat Completions 的本地或远程地址、模型名和需要的密钥，再重启本地启动器。密钥不能出现在文章、日志和测试报告中。

适配器使用 HTTP 调用而不是只留一个 TODO；响应由 Pydantic 严格解析。工具名只能来自枚举，额外 tenant 字段会被拒绝。不同服务对 JSON/工具调用格式的支持可能不同，本实现使用受控 JSON 决策协议，因此应先在自己的模型上测 schema 合法率、任务成功率和耗时。对应服务的原始接口行为参考 [vLLM 官方文档](https://docs.vllm.ai/en/latest/serving/online_serving/openai_compatible_server/)。

这条路径不会自动产生效果保证。接入模型后仍应保留确定性测试、用同一批任务比较模型、记录失败样本，再决定是否允许真实模型负责下一步选择。
