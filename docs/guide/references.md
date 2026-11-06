---
title: 官方资料与阅读顺序
---

# 官方资料与阅读顺序

正文为综合教学设计，不逐字转述某一来源。以下链接主要用于核对机制与深入阅读。核对日期为 2026-11-05，接口、规范和职位会变化；编写工程时以固定版本的文档和测试为准。

## 阅读优先级

1. 先读 Agent 设计与上下文，画出有界执行循环。
2. 再读 Spring AI、持久化与 Memory，形成工具和数据合同。
3. 阅读评测、可观测性与安全资料，建立验证方式。
4. 按岗位深入推理优化、训练与论文。

## 原始资料

### [Anthropic：Applied AI Engineer, Enterprise 岗位样本](https://job-boards.greenhouse.io/anthropic/jobs/5057647008)

岗位样本提到生产应用、评测、Agent、MCP、部署与沟通；仅一个样本，不代表中国或整个行业。

### [Anthropic：Building effective agents](https://www.anthropic.com/research/building-effective-agents)

用来理解 workflow 与 agent 的设计模式；原文发表于 2024 年，工具细节应查当前文档。

### [Attention Is All You Need](https://arxiv.org/abs/1706.03762)

Transformer 与经典注意力机制原论文；不是现代所有模型架构的完整描述。

### [Anthropic：Effective context engineering](https://www.anthropic.com/research/effective-context-engineering-for-ai-agents)

上下文选择、压缩和按需检索的工程讨论。

### [Spring AI：Tool Calling](https://docs.spring.io/spring-ai/reference/api/tools.html)

Java 工具调用接口与执行职责；实现时固定所用版本。

### [Spring AI Reference](https://docs.spring.io/spring-ai/reference/index.html)

Java 模型、工具、RAG 和 memory 能力入口。

### [LangGraph：Persistence](https://docs.langchain.com/oss/python/langgraph/persistence)

持久化、checkpoint 与执行恢复概念。

### [LangChain：Memory overview](https://docs.langchain.com/oss/python/concepts/memory)

会话作用域与跨会话记忆的概念参考。

### [Retrieval-Augmented Generation 原论文](https://arxiv.org/abs/2005.11401)

参数化与外部检索记忆结合的研究起点；工程流程是本教材综合设计。

### [pgvector 官方仓库](https://github.com/pgvector/pgvector)

PostgreSQL 向量检索、索引和过滤实现参考。

### [MCP：Architecture overview](https://modelcontextprotocol.io/docs/learn/architecture)

协议架构和能力边界；对接应以固定规范版本为准。

### [A2A：What is A2A?](https://a2a-protocol.org/latest/topics/what-is-a2a/)

跨 Agent 互操作与任务交流。

### [Temporal：Activity Definition](https://docs.temporal.io/activity-definition)

外部动作与幂等设计的参考。

### [vLLM：Automatic Prefix Caching](https://docs.vllm.ai/en/latest/features/automatic_prefix_caching/)

前缀 KV 复用机制；性能收益依赖实际工作负载。

### [Anthropic：Demystifying evals for AI agents](https://www.anthropic.com/research/demystifying-evals-for-ai-agents)

任务、trial、grader、trace 与最终环境状态的评测思路。

### [OpenTelemetry：GenAI semantic conventions](https://opentelemetry.io/docs/specs/semconv/gen-ai/)

观测语义约定入口；关注所用版本与稳定性。

### [OWASP：LLM Top 10（2025）](https://genai.owasp.org/llm-top-10/)

提示注入、敏感数据、过度权限等风险分类。

### [LoRA 原论文](https://arxiv.org/abs/2106.09685)

低秩适配方法。

### [Hugging Face PEFT：LoRA](https://huggingface.co/docs/peft/en/conceptual_guides/lora)

参数高效微调的实现概念与限制。

## 框架与主题

- [VitePress 官方文档](https://vitepress.dev/)：Markdown、静态构建与本地搜索。
- [Teek 官方文档](https://vp.teek.top/)：基于 VitePress 的博客与知识库主题。
- [Mermaid 官方文档](https://mermaid.js.org/)：文中架构图与时序图。

本书使用本地安装的依赖，没有接入访问统计、广告、评论服务或外部字体。文章里的教学示例并不代表已经上线的业务系统。