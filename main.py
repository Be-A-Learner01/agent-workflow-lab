from typing import TypedDict
from langchain_deepseek import ChatDeepSeek
from langgraph.graph import StateGraph, END

class State(TypedDict):
    topic: str # 选题
    draft: str # 初稿
    review: str # 审核
    final: str # 终稿

llm_write = ChatDeepSeek(model="deepseek-chat", temperature=0.7)
llm_review = ChatDeepSeek(model="deepseek-chat", temperature=0)

def write_draft(state:State):
    try:
        res = llm_write.invoke(f"围绕选题写一段200字的初稿: {state['topic']}")
        return {"draft": res.content}
    except Exception as e:
        return {"draft": f"[写稿失败] {e}"}

def review_draft(state: State):
    try:
        res = llm_review.invoke(f"审核以下初稿,指出问题并给出结论(含‘通过’或‘不通过’): \n{state['draft']}")
        return {"review": res.content}
    except Exception as e:
        return {"review": f"[审核失败] {e}"}


workflow = StateGraph(State)

workflow.add_node("write", write_draft)
workflow.add_node("review", review_draft)
workflow.set_entry_point("write")
workflow.add_edge("write", "review")
workflow.add_edge("review", END)

app = workflow.compile()

for event in app.stream({"topic": "AI Agent 趋势"}):
    node = list(event.keys())[0]
    print(f"▶ 节点 {node} 完成")
    print(f"  状态更新：{event[node]}\n")
