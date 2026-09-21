import os
from typing import TypedDict, Annotated, Sequence
import operator

from dotenv import load_dotenv
from langchain_core.messages import BaseMessage, HumanMessage, SystemMessage, AIMessage
from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.graph import StateGraph, END

# Import real tools including the standout Blast Radius tool
from .tools import get_connected_entities, search_case_memory, check_fraud_policy, calculate_blast_radius

load_dotenv()
llm = ChatGoogleGenerativeAI(model="gemini-1.5-flash", temperature=0.1)

class AgentState(TypedDict):
    messages: Annotated[Sequence[BaseMessage], operator.add]
    case_id: str
    target_transaction: str
    risk_score: float
    evidence: dict
    uncertainty_level: str
    recommended_actions: list

tools = [get_connected_entities, search_case_memory, check_fraud_policy, calculate_blast_radius]
llm_with_tools = llm.bind_tools(tools)

def investigate_trigger(state: AgentState):
    sys_msg = SystemMessage(content=
        "You are an elite Agentic Fraud Investigator powered by TigerGraph. "
        "Your job is to analyze transactions, request graph evidence, assess uncertainty, and recommend the next best action. "
        "\n\n***CRITICAL DIRECTIVE - BLAST RADIUS ANALYSIS***\n"
        "If graph evidence reveals shared devices or IPs across multiple accounts, you MUST use the `calculate_blast_radius` tool to determine the total financial exposure of the network. "
        "Always structure your final recommendation with 'CONFIDENCE:', 'REASONING:', 'BLAST RADIUS:' (if applicable), and 'ACTION:'."
    )
    context_msg = HumanMessage(content=
        f"New alert received for Transaction {state.get('target_transaction')} "
        f"with Vesta ML risk score of {state.get('risk_score')}. Begin investigation."
    )
    return {"messages": [sys_msg, context_msg]}

def gather_evidence(state: AgentState):
    response = llm_with_tools.invoke(state["messages"])
    if hasattr(response, "tool_calls") and response.tool_calls:
        tool_results = []
        for tc in response.tool_calls:
            if tc["name"] == "get_connected_entities": res = get_connected_entities.invoke(tc["args"])
            elif tc["name"] == "search_case_memory": res = search_case_memory.invoke(tc["args"])
            elif tc["name"] == "check_fraud_policy": res = check_fraud_policy.invoke(tc["args"])
            elif tc["name"] == "calculate_blast_radius": res = calculate_blast_radius.invoke(tc["args"])
            else: res = "Tool executed."
            tool_results.append(HumanMessage(content=f"Tool {tc['name']} Result: {res}", name="tool"))
        return {"messages": [response] + tool_results}
    return {"messages": [response]}

def assess_uncertainty(state: AgentState):
    eval_prompt = HumanMessage(content=
        "Based on the evidence, evaluate the uncertainty. "
        "Reply with exactly 'High', 'Medium', or 'Low' as the first word, followed by a brief reason."
    )
    response = llm.invoke(state["messages"] + [eval_prompt])
    
    level = "Medium"
    if "high" in response.content.lower()[:10]: level = "High"
    elif "low" in response.content.lower()[:10]: level = "Low"
    return {"uncertainty_level": level, "messages": [response]}

def recommend_action(state: AgentState):
    action_prompt = HumanMessage(content=
        "Recommend the next best action based on the uncertainty level, policy, and blast radius. Ensure you use the exact required structure (CONFIDENCE, REASONING, BLAST RADIUS, ACTION)."
    )
    response = llm.invoke(state["messages"] + [action_prompt])
    return {"recommended_actions": [response.content], "messages": [response]}

def decide_next_step(state: AgentState):
    # Loop back for more evidence if the agent hasn't calculated blast radius yet but uncertainty is high
    # For simplicity in this demo, we proceed straight to recommendation
    return "recommend_action"

workflow = StateGraph(AgentState)
workflow.add_node("investigate", investigate_trigger)
workflow.add_node("gather_evidence", gather_evidence)
workflow.add_node("assess_uncertainty", assess_uncertainty)
workflow.add_node("recommend_action", recommend_action)

workflow.set_entry_point("investigate")
workflow.add_edge("investigate", "gather_evidence")
workflow.add_edge("gather_evidence", "assess_uncertainty")
workflow.add_conditional_edges("assess_uncertainty", decide_next_step, {"recommend_action": "recommend_action"})
workflow.add_edge("recommend_action", END)

fraud_agent = workflow.compile()
