import os
import pyTigerGraph as tg
from dotenv import load_dotenv

load_dotenv()

class TigerGraphClient:
    def __init__(self):
        self.host = os.getenv("TG_HOST", "http://localhost")
        self.graphname = os.getenv("TG_GRAPH", "FraudGraph")
        self.username = os.getenv("TG_USERNAME", "tigergraph")
        self.password = os.getenv("TG_PASSWORD", "tigergraph")
        self.secret = os.getenv("TG_SECRET", "")
        self.conn = None
        self._connect()

    def _connect(self):
        try:
            # If a secret is provided, we use it to generate a token (common for TG Cloud/Savanna)
            if self.secret:
                self.conn = tg.TigerGraphConnection(
                    host=self.host, 
                    graphname=self.graphname, 
                    gsqlSecret=self.secret
                )
                self.conn.getToken(self.secret)
            else:
                # Basic auth (common for local Community Edition)
                self.conn = tg.TigerGraphConnection(
                    host=self.host, 
                    graphname=self.graphname, 
                    username=self.username, 
                    password=self.password
                )
                if self.host != "http://localhost":
                    self.conn.getToken(self.conn.createSecret())
            print(f"✅ Successfully connected to TigerGraph: {self.graphname}")
        except Exception as e:
            print(f"⚠️ TigerGraph Connection Warning: {e}")
            self.conn = None

    def get_connected_entities(self, transaction_id: str, max_hops: int = 3):
        """
        Executes a GSQL query to find connected accounts, devices, and IPs.
        Assumes a pre-installed GSQL query named 'find_fraud_connections'.
        """
        if not self.conn:
            # Fallback mock for testing UI when DB is offline
            return {"error": "TigerGraph not connected", "mock_data": f"Device IP 192.168.1.1 shared with 3 accounts. 2 prior fraud cases linked to {transaction_id}."}
        
        try:
            # Call the installed GSQL query
            result = self.conn.runInstalledQuery("find_fraud_connections", params={"start_tx": transaction_id, "depth": max_hops})
            return result
        except Exception as e:
            return {"error": str(e)}

# Singleton instance
tg_client = TigerGraphClient()
