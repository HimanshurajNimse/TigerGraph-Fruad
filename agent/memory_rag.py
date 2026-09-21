import os
from langchain_community.vectorstores import FAISS
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_core.documents import Document

class KnowledgeBase:
    def __init__(self):
        # We use Gemini's fast embedding model
        self.embeddings = GoogleGenerativeAIEmbeddings(model="models/embedding-001")
        self.policy_store = None
        self.case_store = None
        self._initialize_stores()

    def _initialize_stores(self):
        # In a real scenario, this loads from data/ folder. We bootstrap with hackathon data.
        
        # 1. Bank Fraud Policies
        policies = [
            Document(page_content="Policy A1: If transaction confidence of fraud > 85% and risk score > 0.9, automatically Block Transaction."),
            Document(page_content="Policy A2: If Device ID is shared across > 3 accounts, flag account and require Step-up Authentication (MFA)."),
            Document(page_content="Policy B1: Escalate to Human Analyst if transaction amount > $50,000 and uncertainty is Medium."),
            Document(page_content="Policy C1: A Suspicious Activity Report (SAR) must be filed if a previously flagged IP is reused.")
        ]
        self.policy_store = FAISS.from_documents(policies, self.embeddings)

        # 2. Case Memory (Prior closed cases)
        prior_cases = [
            Document(page_content="Case #732: Confirmed Fraud. Customer C456 reported ATO. Device D123 was used to transfer $10k. Risk score was 0.88."),
            Document(page_content="Case #3319: Confirmed Fraud. High velocity transfers across 4 accounts using a single VPN IP. Accounts blocked."),
            Document(page_content="Case #4001: False Positive. Customer traveling internationally. IP location mismatch but device was known. Cleared.")
        ]
        self.case_store = FAISS.from_documents(prior_cases, self.embeddings)

    def search_policy(self, query: str, k: int = 2) -> str:
        docs = self.policy_store.similarity_search(query, k=k)
        return "\n".join([d.page_content for d in docs])

    def search_cases(self, query: str, k: int = 2) -> str:
        docs = self.case_store.similarity_search(query, k=k)
        return "\n".join([d.page_content for d in docs])

# Singleton instance
kb = KnowledgeBase()
