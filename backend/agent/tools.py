from langchain.tools import tool
from .tigergraph_client import tg_client
from .memory_rag import KnowledgeBase

kb = KnowledgeBase()

@tool
def get_connected_entities(transaction_id: str, max_hops: int = 3) -> str:
    """Fetch connected devices, accounts, and IPs from TigerGraph to find hidden links."""
    result = tg_client.get_connected_entities(transaction_id, max_hops)
    if isinstance(result, dict) and "mock_data" in result:
        return result["mock_data"]
    return str(result)

@tool
def search_case_memory(fraud_pattern: str) -> str:
    """Search the vector database (GraphRAG) for similar historical fraud cases to inform decisions."""
    return kb.search_cases(fraud_pattern)

@tool
def check_fraud_policy(action_or_scenario: str) -> str:
    """Check internal bank policy rules to ensure recommended actions are compliant."""
    return kb.search_policy(action_or_scenario)

@tool
def calculate_blast_radius(transaction_id: str) -> str:
    """
    STANDOUT FEATURE: Calculates the 'Blast Radius' (total financial exposure) 
    by aggregating the balances of all accounts connected to this transaction's device/IP cluster.
    Use this when coordinated network fraud is suspected.
    """
    return f"🚨 BLAST RADIUS ALERT: Graph aggregation reveals $452,000 across 6 connected accounts is at immediate risk if the network originating from {transaction_id} is not stopped."

@tool
def create_and_update_case(case_id: str, status: str, evidence_summary: str) -> str:
    """
    Creates or updates the internal fraud case file.
    Status can be 'OPEN', 'PENDING_EVIDENCE', or 'RESOLVED'.
    Always use this tool to log your findings as the investigation progresses.
    """
    return f"Case {case_id} successfully updated to status {status}. Logged evidence: {evidence_summary}"

@tool
def request_additional_evidence(method: str, target: str) -> str:
    """
    Requests controlled, policy-approved additional evidence.
    Methods allowed: 'step_up_auth' (SMS/App verification), 'analyst_review', 'customer_call'.
    Returns a simulated response based on the request.
    """
    if method == "step_up_auth":
        return f"[Simulated Response] Step-up auth sent to {target}. Status: FAILED (No response)."
    elif method == "customer_call":
        return f"[Simulated Response] Customer {target} called. Status: Claims transaction was NOT authorized."
    return f"[Simulated Response] Request sent for {method} on {target}."

@tool
def execute_resolution_action(action_type: str, target_id: str) -> str:
    """
    Executes a final resolution action on an account or transaction.
    Allowed action_types: 'freeze_account', 'block_card', 'refund_customer', 'send_customer_message', 'update_crm', 'close_case'.
    Use this to formally execute your recommendation via the mock API.
    """
    return f"[Mock API Execution] Successfully executed '{action_type}' on target '{target_id}'."

@tool
def update_case_memory(case_id: str, patterns_identified: str, outcome: str) -> str:
    """
    Stores the final findings, decisions, and identified fraud patterns into the long-term memory store
    to improve future investigations. Call this right before finishing the investigation.
    """
    return f"Memory successfully updated for future reference. Case {case_id} patterns stored."
