from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from workflow import app_graph


app = FastAPI(title="Agent-workflow-lab")

@app.get("/health")
async def health():
    return {"status":"ok"}

@app.websocket("/ws/run")
async def run_workflow(ws: WebSocket):
    await ws.accept()
    try:
        payload = await ws.receive_json()
        topic = payload.get("topic", "AI Agent 趋势")

        async for event in app_graph.astream(
            {"topic": topic, "retry_count": 0},
            stream_mode="updates",
            config={"recursion_limit": 10},
        ):
            print(f"后端捕获到事件: {event}")


            if not event:
                continue


            for node, update in event.items():
                await ws.send_json(
                    {
                        "type": "node_done",
                        "node": node,
                        "update": {k: str(v)[:200] for k, v in update.items()},
                    }
                )
        await ws.send_json({"type": "done"})
    except WebSocketDisconnect:
        print("前端链接断开")