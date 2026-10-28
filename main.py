from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from workflow import app_graph
import asyncio

app = FastAPI(title="Agent-workflow-lab")


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.websocket("/ws/run")
async def run_workflow(ws: WebSocket):
    await ws.accept()
    print("=== 前端已连接 ===")
    try:
        payload = await ws.receive_json()
        topic = payload.get("topic", "AI Agent 趋势")
        print(f"=== 收到任务: {topic} ===")

        current_state = {"topic": topic, "retry_count": 0}

        async for event in app_graph.astream(current_state, stream_mode="updates", config={"recursion_limit": 10}):
            if not event:
                continue

            for node, update in event.items():
                print(f"🔍 准备发送开始信号: {node}")
                # 修正：这里必须是 node_start
                await ws.send_json({"type": "node_start", "node": node})

                await asyncio.sleep(1)  # 暂停 1 秒，方便前端看到蓝色的过程

                print(f"✅ 准备发送结束信号: {node}")
                # 修正：这里必须是 node_done
                await ws.send_json(
                    {
                        "type": "node_done",
                        "node": node,
                        "update": {k: str(v)[:200] for k, v in update.items()}
                    }
                )

        print("🎉 流程执行完毕，发送 done")
        # 这里才是真正的全流程结束
        await ws.send_json({"type": "done"})

    except WebSocketDisconnect:
        print("前端链接断开")
    except Exception as e:
        print(f"=== 发生严重错误: {e} ===")