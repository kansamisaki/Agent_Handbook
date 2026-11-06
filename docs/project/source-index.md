---
title: 完整源码导读
---

# 完整源码导读

这里展示的是工程中的完整文件，自动从已测试源码生成。下载包还包含项目入口、POM、依赖锁、样本数据和测试报告。

**[下载完整 Python/Java 工程](/downloads/ops-copilot.zip)** · [先运行一次](/project/quickstart)

## 建议阅读顺序

先读 contracts → model → worker，理解模型能输出什么；再读 store 和 memory，理解状态如何保存；最后对照 Java TicketService 和集成测试，看两个事务边界如何通过稳定动作标识收敛。

| 文件职责 | 完整路径 |
| --- | --- |
| [Python API、审批与 SSE](/project/source-api) | `agent/copilot/api.py` |
| [Python Agent 执行器](/project/source-worker) | `agent/copilot/worker.py` |
| [持久状态、租约与 fencing](/project/source-store) | `agent/copilot/store.py` |
| [Memory 事实、版本与索引](/project/source-memory) | `agent/copilot/memory.py` |
| [确定性基线与真实 HTTP 模型适配器](/project/source-model) | `agent/copilot/model.py` |
| [Python 类型与摘要合同](/project/source-contracts) | `agent/copilot/contracts.py` |
| [知识摄入与版本过滤](/project/source-knowledge) | `agent/copilot/knowledge.py` |
| [身份与运行配置](/project/source-config) | `agent/copilot/config.py` |
| [Java 事务、审批签名与幂等](/project/source-java-tickets) | `business/src/main/java/book/copilot/TicketService.java` |
| [Java HTTP 业务接口](/project/source-java-controller) | `business/src/main/java/book/copilot/BusinessController.java` |
| [Java 字段合同](/project/source-java-contracts) | `business/src/main/java/book/copilot/Contracts.java` |
| [Java 演示身份边界](/project/source-java-identity) | `business/src/main/java/book/copilot/Identity.java` |
| [Java 业务表结构](/project/source-sql) | `business/src/main/resources/schema.sql` |
| [核心不变量测试](/project/source-test-core) | `agent/tests/test_core.py` |
| [真实 HTTP 与崩溃恢复测试](/project/source-test-integration) | `agent/tests/test_integration.py` |
| [本机启动与进程退出](/project/source-launcher) | `scripts/dev.py` |
| [端到端 CLI 演示](/project/source-demo) | `scripts/demo.py` |
| [任务评测 CLI](/project/source-evaluate) | `scripts/evaluate.py` |
| [一致数据库快照](/project/source-backup) | `scripts/backup.py` |
| [队列与 KV 容量估算](/project/source-capacity) | `scripts/capacity.py` |
| [单机容器配置（未启动验证）](/project/source-compose) | `compose.yaml` |
| [PostgreSQL 适配设计（尚未实现）](/project/source-postgres) | `infra/postgres-queue.sql` |

## 本地与进阶的区别

Python/Java、本地 SQLite/H2、HTTP、Memory 和故障恢复已执行测试。PostgreSQL SQL 是独立适配器的设计参考，Compose 是待验证的单机容器配置；它们没有被算作已经运行的部署。真实模型 HTTP 适配器做了协议测试，尚未执行付费模型质量评测。
