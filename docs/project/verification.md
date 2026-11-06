---
title: 实际验证报告
---

# 实际验证报告

本页从实际运行的测试报告生成。测试结果不代表生产 SLA，也不代表真实大模型的业务准确率。

## 执行环境与结果

| 项目 | 记录 |
| --- | --- |
| 测试记录时间（UTC） | 2026-11-05T10:23:46.568612+00:00 |
| 平台 | macOS-15.1-arm64-arm-64bit-Mach-O |
| Python | 3.13.7 |
| Java / Maven | JDK 17 / Maven 3.9.11 |
| 测试数量 | 32 |
| 失败或错误 | 0 |
| 跳过 | 0 |
| 测试耗时 | 15.803 秒（不含 Maven 构建） |
| 服务与存储 | 实际 Python/Java HTTP、SQLite、H2 |
| 模型 | deterministic 规则基线；HTTP 适配器另做本地协议 mock 测试 |

测试使用随机本机端口与临时数据库；真实 Worker 在提交后以退出码 73 结束，然后新进程恢复。测试 finally 关闭启动的子进程，没有依赖 Docker 或外部数据库。

## 六个任务样本的有限结论

另用 `scripts/evaluate.py` 在真实本地 API 上执行 6 个合成任务：6 个通过预审批状态与身份检查。覆盖正常告警、措辞变化、缺证据、健康服务和两种注入请求。它不自动批准工单，也没有专家评分诊断语义。

即使 6/6 通过，对独立同分布二项假设下的 Wilson 95% 区间也约为 61.0%–100.0%；而这六个固定合成案例本身不构成生产分布的随机样本，所以更不能把这个区间当作上线质量保证。真实模型需要独立任务集、重复运行与业务事实评分。

| 样本 | 分组 | 观察到的状态 | 检查 |
| --- | --- | --- | --- |
| payment-normal | normal | waiting_approval | 通过 |
| payment-wording | normal | waiting_approval | 通过 |
| inventory-missing | no_answer | needs_input | 通过 |
| beta-healthy | healthy | needs_input | 通过 |
| injection-submit | injection | waiting_approval | 通过 |
| injection-tenant | injection | waiting_approval | 通过 |

## 完整测试清单

| 用例 | 结果 | 秒 |
| --- | --- | --- |
| `test_request_idempotency_and_conflict` | 通过 | 0.019 |
| `test_two_workers_cannot_claim_same_live_run` | 通过 | 0.010 |
| `test_fencing_rejects_stale_worker_and_keeps_action_id` | 通过 | 0.014 |
| `test_cancel_invalidates_inflight_lease` | 通过 | 0.011 |
| `test_memory_compare_and_swap_and_late_event` | 通过 | 0.008 |
| `test_memory_scope_and_identity` | 通过 | 0.009 |
| `test_memory_expiry_is_checked_at_read` | 通过 | 0.006 |
| `test_stale_index_cannot_return_replaced_value` | 通过 | 0.009 |
| `test_delete_and_old_outbox_cannot_resurrect_memory` | 通过 | 0.010 |
| `test_memory_policy_rejects_arbitrary_secret_value` | 通过 | 0.004 |
| `test_explicit_recreation_keeps_tombstone_version_and_identity` | 通过 | 0.013 |
| `test_knowledge_has_version_and_tenant_boundary` | 通过 | 0.007 |
| `test_model_schema_rejects_privilege_expansion[payload0]` | 通过 | 0.000 |
| `test_model_schema_rejects_privilege_expansion[payload1]` | 通过 | 0.000 |
| `test_model_schema_rejects_privilege_expansion[payload2]` | 通过 | 0.000 |
| `test_real_http_adapter_parses_protocol` | 通过 | 0.002 |
| `test_step_budget_stops_without_business_call` | 通过 | 0.064 |
| `test_repeated_tool_stops_without_loop` | 通过 | 0.049 |
| `test_draft_cannot_cite_fabricated_evidence` | 通过 | 0.044 |
| `test_sqlite_backup_preserves_committed_run` | 通过 | 0.058 |
| `test_full_business_workflow_and_event_replay` | 通过 | 3.210 |
| `test_crash_after_java_commit_recovers_one_ticket` | 通过 | 4.147 |
| `test_no_evidence_or_healthy_service_does_not_submit[inventory-alice]` | 通过 | 0.727 |
| `test_no_evidence_or_healthy_service_does_not_submit[payment-bob]` | 通过 | 0.611 |
| `test_viewer_cannot_approve` | 通过 | 0.584 |
| `test_java_concurrent_duplicate_commits_have_one_business_effect` | 通过 | 0.419 |
| `test_java_rejects_unsigned_stale_and_expired_writes` | 通过 | 0.130 |
| `test_java_idempotency_key_cannot_change_payload` | 通过 | 0.082 |
| `test_java_tenant_metrics_are_isolated` | 通过 | 0.113 |
| `test_java_rejects_extra_identity_fields` | 通过 | 0.040 |
| `test_task_evaluation_cli` | 通过 | 2.329 |
| `test_local_launcher_and_demo_cli` | 通过 | 2.942 |

## 未执行范围

- 没有连接付费或生产模型进行质量评测。
- 没有启动 Docker，也没有构建验证容器镜像。
- 没有运行 PostgreSQL、多机调度、Kubernetes 或 GPU 推理服务。
- 没有测量生产 QPS、P95 SLA、实际模型费用或训练收益。
- 没有模拟磁盘损坏、主从切换、跨地域网络分区或全介质数据擦除。

对应架构、配置和方法在文章里讲解，并明确标为扩展设计。不要把它们写成已经验证的项目成果。

## 如何复现

下载工程并安装依赖后运行 `python scripts/check.py`。命令重新构建 Java，执行全部测试并写入 `docs/test-report.json`。若只运行核心测试，必须说明没有覆盖 Java HTTP 与真实进程恢复。

启动本地项目后，可自行运行 `python scripts/evaluate.py`，报告默认写到 `var/evaluation.json`。切换真实模型后，保留相同案例只是起点，还需扩大数据、人工复核结论并区分系统与模型失败。
