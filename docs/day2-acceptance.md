# Day 2 验收记录

- **日期**：2026-10-22
- **主题**：条件边 + 循环 + 多 Agent 协作
- **项目**：agent-workflow-lab
- **环境**：uv + Python 3.11/3.12 + LangGraph + LangChain + langchain-deepseek

## 验收标准

| # | 验收项 | 状态 | 说明 |
|---|--------|------|------|
| 1 | 审核不通过时自动打回重写 | ✅ 通过 | `should_continue` 在审核结论不含“通过”或含“不通过”时返回 `"rewrite"`，条件边路由回 `write` 节点，`write_draft` 读取上一轮 `review` 作为重写依据 |
| 2 | 重试超过 3 次强制结束（防止死循环） | ✅ 通过 | `retry_count` 在 `write_draft` 中递增，`should_continue` 判断 `>= 3` 时返回 `END`；另加 `config={"recursion_limit": 10}` 作为框架级兜底 |
| 3 | 能打印每次重试的轮次 | ✅ 通过 | `stream` 输出中可见 `write` 与 `review` 交替执行，`review_draft` 在 LLM 调用后打印当前版本号与审核结论摘要 |

## 运行结果摘要

- **正常流程**：`write` 生成初稿 → `review` 审核 → 若通过则走 `END` 结束；若不通过则条件边回到 `write`，`write_draft` 读取上一轮 `review` 意见重写。
- **强制不通过测试**：临时将 `review_draft` 硬编码返回“不通过，需重写”，确认 `write` 被连续调用 3 次、`retry_count` 逐次递增、第 3 次后走 `END` 停止，未出现无限循环。
- **多 Agent 协作（扩展）**：将写稿与审核拆分为独立 Agent，Writer 仅接收 `topic` 与上一轮审核意见，Reviewer 仅接收 `draft`，`should_continue` 作为 supervisor 路由，上下文隔离生效。

## 关键技术点

- 条件边通过 `add_conditional_edges("review", should_continue, {END: END, "rewrite": "write"})` 注册，删除了原有的 `add_edge("review", END)`，避免普通边与条件边冲突。
- “通过”判断修正为 `"通过" in review and "不通过" not in review`，排除“不通过”字符串误匹配。
- `retry_count` 仅在 `write_draft` 中递增，语义为“已写版本数”，避免与“审核次数”混淆。
- 节点函数保留 try/except，LLM 调用异常时写入错误信息而非中断流程。
- 使用 `config={"recursion_limit": 10}` 作为业务计数器之外的第二道防死循环保险。

## 遗留项

- 多 Agent 拆分目前为手动实现（子图/独立 State 命名空间），未引入 `langgraph-supervisor` 等外部包；后续 Agent 数量增加时可评估是否需要引入。
- 审核 Agent 的完整推理过程仍会通过 `review` 字段流入 Writer，后续可进一步只传递结论字段以强化上下文隔离。
- WebSocket 实时推送（Day 3）尚未开始，当前仅用 `stream` 在终端打印。

## 验收结论

**Day 2 三项验收标准全部通过，多 Agent 协作扩展亦跑通。** 条件边、循环、重试计数器与防死循环机制均按预期工作，可进入 Day 3（FastAPI WebSocket 实时推送）。