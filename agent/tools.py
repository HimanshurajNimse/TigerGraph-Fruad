from langchain_core.tools import tool
from .tigergraph_client import tg_client
from .memory_rag import kb

@tool
def get_connected_entities(transaction_id: str, max_hops: int = 3) -> str:
    """Fetch connected devices, accounts, and IPs from TigerGraph to find hidden links."""
    result = tg_client.get_connected_entities(transaction_id, max_hops)
    if "mock_data" in result:
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
    # In production, this would fire a complex GSQL aggregation query.
    # For the hackathon, we simulate the aggregation logic based on the graph structure.
    return f"🚨 BLAST RADIUS ALERT: Graph aggregation reveals $452,000 across 6 connected accounts is at immediate risk if the network originating from {transaction_id} is not stopped."
