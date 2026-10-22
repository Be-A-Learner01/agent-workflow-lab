from typing import TypedDict
from langchain_deepseek import ChatDeepSeek
from langgraph.graph import StateGraph, END

class State(TypedDict):
    topic: str # 选题
    draft: str # 初稿
    review: str # 审核
    final: str # 终稿
    retry_count: int #重写次数

llm_write = ChatDeepSeek(model="deepseek-chat", temperature=0.7)
llm_review = ChatDeepSeek(model="deepseek-chat", temperature=0)

def write_draft(state:State):
    retry = state.get("retry_count", 0)
    if retry > 0 and state.get("review"):
        prompt = f"选题: {state['topic']}\n上一版审核被驳回,意见: {state['review']}\n请重写"

    else:
        prompt = f"围绕选题写一段200字的初稿: {state['topic']}"
    try:
        w_res = llm_write.invoke(prompt)
        return {"draft": w_res.content, "retry_count": retry + 1}

    except Exception as e:
        return {"draft": f"[写稿失败] {e}", "retry_count": retry + 1}


def review_draft(state: State):
    try:
        r_res = llm_review.invoke(f"审核以下初稿,指出问题并给出结论(含‘通过’或‘不通过’): \n{state['draft']}")
        print(f"第 {state.get('retry_count', 1)} 版,审核结果:{r_res.content[:50]}...")
        return {"review": "不通过,需要重写"}
    except Exception as e:
        return {"review": f"[审核失败] {e}"}


def should_continue(state: State):
    review = state.get("review", "")

    if "通过" in review and "不通过" not in review:
        return END

    if  state.get("retry_count", 0) >= 3:
        return END
    return "rewrite"

workflow = StateGraph(State)

workflow.add_node("write", write_draft)
workflow.add_node("review", review_draft)
workflow.set_entry_point("write")
workflow.add_edge("write", "review")

workflow.add_conditional_edges("review", should_continue, {END: END, "rewrite": "write"} )

app = workflow.compile()

for event in app.stream({"topic": "AI Agent 趋势"}, config={"recursion_limit": 10}):
    node = list(event.keys())[0]
    print(f"▶ 节点 {node} 完成")
    print(f"  状态更新：{event[node]}\n")
