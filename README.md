# 🔍 FraudLens AI - TigerGraph GraphRAG Agent

FraudLens AI is an autonomous, AI-driven financial crime investigation agent powered by **TigerGraph** and **GraphRAG**. It drastically reduces the time required to triage, investigate, and resolve complex fraud cases by visualizing multi-hop graph networks and autonomously generating actionable resolution strategies.

## 🚀 Key Features

* **Autonomous Case Triage:** The AI evaluates risk scores and categorizes incoming threats (Synthetic ID, Velocity Spikes, Location Mismatch).
* **GraphRAG Investigation:** Streams AI chain-of-thought in real-time as the agent navigates the TigerGraph knowledge graph to find evidence.
* **Dynamic Network Visualization:** Visualizes the "blast radius" using interactive 3D topology graphs, exposing shared SSNs, IP addresses, and dormant accounts spanning multiple degrees of separation.
* **Automated Action Plans:** Generates optimal resolution strategies based on internal graph policy.
* **Compliance Ready (SAR Generation):** Features a 1-click export for **Suspicious Activity Reports (SAR)**, saving all findings, evidence, and actions directly into a compliant PDF.

## 🛠 Tech Stack

* **Frontend:** React, TailwindCSS, Vite, Plotly (for 3D Graph Visualization), Lucide Icons, jsPDF/html2canvas.
* **Backend:** Django, Python, Server-Sent Events (SSE) for real-time AI streaming.

## 🏁 Hackathon Rubric Alignment

This project fully satisfies the core hackathon requirements:
1. **Answer File / Suspicious Activity Report:** Generates a downloadable PDF containing the case records, evidence, and decisions.
2. **Written to the Graph:** The execution log demonstrates vectorizing and storing updated embeddings back into TigerGraph.
3. **Next Best Action & Approval Routes:** Clearly maps out autonomous actions (Execute Strategy) vs. required human interventions (Escalate to L2).

## ⚙️ How to Run Locally

### 1. Start the Backend (Django)
```bash
cd backend
python -m venv .venv
# Activate virtual environment:
# Windows: .\.venv\Scripts\Activate.ps1
# Mac/Linux: source .venv/bin/activate

pip install -r requirements.txt
python manage.py runserver
```

### 2. Start the Frontend (React/Vite)
```bash
cd frontend
npm install
npm run dev
```

### 3. Open the App
Navigate to `http://localhost:5173` in your browser.
