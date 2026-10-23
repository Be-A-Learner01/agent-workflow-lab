# Day 3 验收记录

- **日期**：2026-10-23
- **主题**：FastAPI WebSocket 实时推送工作流进度
- **技术栈**：FastAPI + LangGraph (astream) + LangChain (ainvoke) + Vite React + Tailwind CSS

## 验收标准

| # | 验收项 | 状态 | 说明 |
|---|--------|------|------|
| 1 | 前端点“开始”，后端工作流启动 | ✅ 通过 | React 前端点击按钮后，通过 WebSocket 发送 topic，后端成功接收并开始执行 |
| 2 | 每个节点完成时，前端立即出现进度 | ✅ 通过 | 后端通过 `astream(..., stream_mode="updates")` 逐节点抛出事件，前端实时渲染节点进度（不再是等全部跑完才出结果） |
| 3 | 全部跑完后前端显示结束提示 | ✅ 通过 | 图执行完毕后，后端发送 `{"type": "done"}`，前端渲染 `🎉 全部完成` |
| 4 | 前端中途关闭连接，后端不崩溃 | ✅ 通过 | 关闭前端标签页后，后端终端打印 `前端链接断开`（`WebSocketDisconnect` 被成功捕获），进程正常运行 |

## 关键技术点与运行摘要

- **异步改造**：将原同步的 `llm.invoke` 全部改为异步的 `await llm.ainvoke`，解决 WebSocket 长连接下事件循环阻塞的问题。
- **流式推送**：使用 `app_graph.astream(..., stream_mode="updates")` 逐节点推送状态，前端通过 `ws.onmessage` 实时接收。
- **防死循环**：保留了 Day 2 的 `recursion_limit=10` 兜底配置。
- **循环与自我修正**：LLM 表现惊艳，第 1 版被打回后，第 2 版不仅根据审核意见修改，还附带了一份“修订说明”，导致第 2 次审核直接被判定为“通过”。
- **前端表现**：使用 Vite + React + Tailwind v4 搭建，通过 WebSocket 接收 JSON 并逐条追加渲染日志列表。

## 踩坑与排错记录（重要经验）

1. **Tailwind CSS v4 的配置变化**：
   - **问题**：按旧教程运行 `npx tailwindcss init -p` 报错。
   - **原因**：v4 版本移除了 init 命令，且配置方式发生重大改变。
   - **解决**：卸载旧包，安装 `@tailwindcss/vite` 插件，在 `vite.config.js` 中引入插件，并在 `index.css` 中直接写 `@import "tailwindcss";`。
2. **`stream_mode` 拼写错误导致流式失效**：
   - **问题**：前端只收到了最后的 `{"type": "done"}`，没有收到中间的节点进度。
   - **原因**：`main.py` 中误将参数写成了 `stream_mode="update"`（少了一个 `s`）。
   - **解决**：改为正确的 `stream_mode="updates"` 后恢复正常。
3. **浏览器无法直接访问 WebSocket 端点**：
   - **问题**：在浏览器地址栏直接输入 `/ws/run` 报 404。
   - **原因**：WebSocket 需要专用的客户端进行协议升级，不能通过普通的 HTTP GET 访问。
   - **解决**：使用前端页面或浏览器 DevTools 控制台测试。

## 遗留项与后续优化

- **审核判定的脆弱性**：目前依然依赖 LLM 输出文字“通过”或“不通过”来进行字符串匹配。若模型不按套路出牌，容易出错。后续可考虑引入 Pydantic 结构化输出（`with_structured_output`）强制模型返回布尔值或枚举。
- **心跳机制缺失**：目前的 WebSocket 没有实现 ping/pong 心跳，如果网络环境不稳定，连接可能会被中间件掐断。本地开发暂不影响。

## 验收结论

**Day 3 四项验收标准全部通过。** 工作流已从“后台默默运行”升级为“前端实时可见”，前后端异步通信链路完全打通。