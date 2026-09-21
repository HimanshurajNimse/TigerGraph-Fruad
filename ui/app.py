import streamlit as st
import pandas as pd
import plotly.graph_objects as go
import time
import sys
import os

# Import agent
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from agent.graph import fraud_agent

st.set_page_config(
    page_title="FraudLens - AI Fraud Investigation",
    page_icon="🛡️",
    layout="wide",
    initial_sidebar_state="expanded"
)

# --- STATE MANAGEMENT ---
if 'logged_in' not in st.session_state:
    st.session_state.logged_in = False
if 'current_view' not in st.session_state:
    st.session_state.current_view = 'Dashboard'
if 'investigation_data' not in st.session_state:
    st.session_state.investigation_data = None
if 'agent_messages' not in st.session_state:
    st.session_state.agent_messages = []

# --- CSS INJECTION ---
def inject_global_css():
    st.markdown("""
    <style>
        /* Base Theme Colors: Deep Dark Blue/Purple */
        :root {
            --bg-main: #060913;
            --bg-panel: #111827;
            --border-color: #1F2937;
            --text-main: #F3F4F6;
            --text-muted: #9CA3AF;
            --accent-primary: #6366F1;
            --accent-hover: #4F46E5;
        }
        
        .stApp {
            background-color: var(--bg-main);
            color: var(--text-main);
        }
        
        /* Hide Top Padding */
        .block-container {
            padding-top: 1rem !important;
            padding-bottom: 2rem !important;
            max-width: 100% !important;
        }

        /* Sidebar Styling */
        [data-testid="stSidebar"] {
            background-color: #0A0D14;
            border-right: 1px solid var(--border-color);
        }

        /* General UI Elements */
        h1, h2, h3 { color: #FFFFFF !important; font-weight: 700 !important; }
        
        /* Streamlit Buttons */
        .stButton>button {
            background: linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%) !important;
            color: white !important;
            border: none !important;
            border-radius: 0.5rem !important;
            font-weight: 600 !important;
            padding: 0.5rem 1.5rem !important;
            transition: all 0.2s ease !important;
        }
        .stButton>button:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4) !important;
        }
        
        /* Outline Button (Secondary) */
        .outline-btn .stButton>button {
            background: transparent !important;
            border: 1px solid #4B5563 !important;
            color: white !important;
        }
        .outline-btn .stButton>button:hover {
            border-color: #9CA3AF !important;
            background: rgba(255,255,255,0.05) !important;
        }
        
        /* Cards */
        div[data-testid="stVerticalBlock"] > div[style*="flex-direction: column;"] > div[data-testid="stVerticalBlock"] {
            background-color: var(--bg-panel);
            border: 1px solid var(--border-color);
            border-radius: 0.75rem;
            padding: 1.5rem;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.2);
        }
        
        /* Badges */
        .badge {
            display: inline-block;
            padding: 0.25rem 0.75rem;
            border-radius: 9999px;
            font-size: 0.75rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }
        .badge-high { background-color: rgba(239, 68, 68, 0.1); color: #EF4444; border: 1px solid rgba(239, 68, 68, 0.2); }
        .badge-progress { background-color: rgba(99, 102, 241, 0.1); color: #6366F1; border: 1px solid rgba(99, 102, 241, 0.2); }

        /* Tabs */
        .stTabs [data-baseweb="tab-list"] {
            gap: 2rem;
            border-bottom: 1px solid var(--border-color);
            background-color: transparent;
        }
        .stTabs [data-baseweb="tab"] {
            height: 3rem;
            background-color: transparent;
            color: var(--text-muted);
        }
        .stTabs [aria-selected="true"] {
            color: var(--accent-primary) !important;
            border-bottom: 2px solid var(--accent-primary) !important;
        }
    </style>
    """, unsafe_allow_html=True)

inject_global_css()

# ==========================================
# PAGE: LANDING PAGE (If not logged in)
# ==========================================
if not st.session_state.logged_in:
    # Hide sidebar entirely on landing page
    st.markdown("""
        <style>
            [data-testid="collapsedControl"] { display: none !important; }
            [data-testid="stSidebar"] { display: none !important; }
        </style>
    """, unsafe_allow_html=True)

    # 1. Navbar
    st.markdown("""
    <div style="display: flex; justify-content: space-between; align-items: center; padding: 1rem 4rem; border-bottom: 1px solid #1F2937;">
        <div style="display: flex; align-items: center; gap: 0.5rem;">
            <h3 style="margin: 0; color: #6366F1 !important; font-weight: 800 !important;">🛡️ FraudLens</h3>
        </div>
        <div style="display: flex; gap: 2rem; color: #9CA3AF; font-size: 0.9rem; font-weight: 500;">
            <span style="cursor: pointer; color: white;">Product</span>
            <span style="cursor: pointer; hover: text-white;">Use Cases</span>
            <span style="cursor: pointer;">How It Works</span>
            <span style="cursor: pointer;">About</span>
        </div>
        <div>
            <!-- Navbar Buttons (Handled via Streamlit columns below to preserve state) -->
        </div>
    </div>
    """, unsafe_allow_html=True)
    
    # We place the actual buttons using absolute/negative margin hacks so they sit in the navbar,
    # or we just place them directly under it. Let's use a nice layout:
    nav_col1, nav_col2, nav_col3, nav_col4 = st.columns([1, 10, 1, 1.2])
    with nav_col3:
        st.markdown("<div class='outline-btn' style='margin-top: -65px;'>", unsafe_allow_html=True)
        st.button("Sign In")
        st.markdown("</div>", unsafe_allow_html=True)
    with nav_col4:
        st.markdown("<div style='margin-top: -65px;'>", unsafe_allow_html=True)
        if st.button("Get Started", key="nav_get_started"):
            st.session_state.logged_in = True
            st.rerun()
        st.markdown("</div>", unsafe_allow_html=True)

    st.markdown("<br><br><br>", unsafe_allow_html=True)

    # 2. Hero Section
    hero_left, hero_right = st.columns([1, 1.2])
    
    with hero_left:
        st.markdown("""
        <div style="padding-left: 4rem;">
            <h1 style="font-size: 4.5rem; line-height: 1.1; margin-bottom: 1.5rem;">
                <span style="color: white;">See the Connections</span><br>
                <span style="background: linear-gradient(90deg, #EC4899, #8B5CF6); -webkit-background-clip: text; color: transparent;">Stop the Fraud</span><br>
                <span style="color: #60A5FA;">Stay Ahead</span>
            </h1>
            <p style="color: #9CA3AF; font-size: 1.2rem; margin-bottom: 3rem; max-width: 80%; line-height: 1.6;">
                An AI-powered fraud investigation platform driven by graph intelligence.
            </p>
        </div>
        """, unsafe_allow_html=True)
        
        # Hero Buttons
        bcol1, bcol2, bcol3 = st.columns([0.15, 0.35, 0.35])
        with bcol2:
            if st.button("Get Started →", key="hero_get_started", use_container_width=True):
                st.session_state.logged_in = True
                st.rerun()
        with bcol3:
            st.markdown("<div class='outline-btn'>", unsafe_allow_html=True)
            st.button("▶ Watch Demo", use_container_width=True)
            st.markdown("</div>", unsafe_allow_html=True)

    with hero_right:
        # Plotly Globe / Network Visualization
        # Coordinates for nodes to look like a globe network
        node_x = [0, 1, 0.7, -0.7, -1, -0.3, 0.3, 0]
        node_y = [1, 0.3, -0.7, -0.7, 0.3, -0.2, 0.5, 0]
        node_text = ["", "Transaction", "Fraud Case", "Account", "Device", "", "Customer", ""]
        colors = ['rgba(99,102,241,0.5)', '#3B82F6', '#EF4444', '#10B981', '#8B5CF6', 'rgba(99,102,241,0.5)', '#3B82F6', 'rgba(99,102,241,0.5)']
        sizes = [10, 25, 35, 25, 25, 10, 25, 10]
        
        fig = go.Figure()
        
        # Add a faint circular background to mimic the globe
        fig.add_shape(type="circle", xref="x", yref="y", x0=-1.5, y0=-1.5, x1=1.5, y1=1.5,
                      line_color="rgba(99, 102, 241, 0.1)", line_width=1)
        fig.add_shape(type="circle", xref="x", yref="y", x0=-1.2, y0=-1.2, x1=1.2, y1=1.2,
                      line_color="rgba(99, 102, 241, 0.2)", line_width=1)
        fig.add_shape(type="circle", xref="x", yref="y", x0=-0.8, y0=-0.8, x1=0.8, y1=0.8,
                      line_color="rgba(99, 102, 241, 0.1)", line_width=1)

        # Edges
        edges = [(0,1), (1,6), (6,5), (5,4), (4,3), (3,2), (2,7), (7,6), (6,2), (1,7), (7,4)]
        for edge in edges:
            fig.add_trace(go.Scatter(x=[node_x[edge[0]], node_x[edge[1]]], y=[node_y[edge[0]], node_y[edge[1]]],
                                     mode='lines', line=dict(color='rgba(99, 102, 241, 0.3)', width=2)))
        
        # Nodes
        fig.add_trace(go.Scatter(x=node_x, y=node_y, mode='markers+text', text=node_text,
                                 textposition="bottom center", textfont=dict(color="#E2E8F0", size=14, family="Arial"),
                                 marker=dict(size=sizes, color=colors, line=dict(width=2, color='rgba(255,255,255,0.4)'))))
        
        fig.update_layout(showlegend=False, margin=dict(b=0,l=0,r=0,t=0),
                          xaxis=dict(showgrid=False, zeroline=False, showticklabels=False, range=[-1.8, 1.8]),
                          yaxis=dict(showgrid=False, zeroline=False, showticklabels=False, range=[-1.8, 1.8]),
                          plot_bgcolor="rgba(0,0,0,0)", paper_bgcolor="rgba(0,0,0,0)", height=500)
        
        st.plotly_chart(fig, use_container_width=True, config={'displayModeBar': False})

    st.markdown("<br><br><br>", unsafe_allow_html=True)
    
    # 3. Bottom Stats Bar
    st.markdown("""
    <div style="display: flex; justify-content: space-around; padding: 2rem 4rem; border-top: 1px solid #1F2937; margin-top: 2rem;">
        <div style="text-align: center;">
            <div style="font-size: 2.5rem; font-weight: 700; color: white;">590K</div>
            <div style="color: #9CA3AF; font-size: 0.9rem; text-transform: uppercase;">Transactions</div>
        </div>
        <div style="text-align: center;">
            <div style="font-size: 2.5rem; font-weight: 700; color: white;">13.5K</div>
            <div style="color: #9CA3AF; font-size: 0.9rem; text-transform: uppercase;">Customers</div>
        </div>
        <div style="text-align: center;">
            <div style="font-size: 2.5rem; font-weight: 700; color: white;">5</div>
            <div style="color: #9CA3AF; font-size: 0.9rem; text-transform: uppercase;">Known Patterns</div>
        </div>
        <div style="text-align: center;">
            <div style="font-size: 2.5rem; font-weight: 700; color: white;">20</div>
            <div style="color: #9CA3AF; font-size: 0.9rem; text-transform: uppercase;">Benchmark Cases</div>
        </div>
    </div>
    """, unsafe_allow_html=True)


# ==========================================
# PAGE: DASHBOARD & WORKSPACE (If logged in)
# ==========================================
if st.session_state.logged_in:
    
    with st.sidebar:
        st.markdown("<h2 style='color:#6366F1; margin-bottom: 2rem;'>🛡️ FraudLens</h2>", unsafe_allow_html=True)
        
        nav_selection = st.radio(
            "Navigation",
            ["Dashboard", "Investigations", "Transactions", "Customers", "Graph Explorer", "Cases", "Settings"],
            label_visibility="collapsed"
        )
        st.session_state.current_view = nav_selection
        
        st.markdown("---")
        st.markdown("""
            <div style="display: flex; align-items: center; gap: 10px; padding: 10px; background: #151B2B; border-radius: 8px;">
                <div style="width: 32px; height: 32px; border-radius: 50%; background: #6366F1; display: flex; align-items: center; justify-content: center; font-weight: bold; color: white;">AN</div>
                <div>
                    <div style="font-size: 0.875rem; font-weight: 600; color: white;">Analyst Nimse</div>
                    <div style="font-size: 0.75rem; color: #94A3B8;">Fraud Team</div>
                </div>
            </div>
        """, unsafe_allow_html=True)
        
        st.markdown("<br>", unsafe_allow_html=True)
        if st.button("Sign Out"):
            st.session_state.logged_in = False
            st.rerun()

    # --- DASHBOARD VIEW ---
    if st.session_state.current_view == 'Dashboard':
        st.markdown("<h2>Welcome back, Analyst!</h2>", unsafe_allow_html=True)
        st.markdown("<p style='color: #94A3B8; margin-bottom: 2rem;'>Here's what's happening today.</p>", unsafe_allow_html=True)
        
        m1, m2, m3, m4 = st.columns(4)
        with m1: st.metric("New Investigations", "24", "+12%")
        with m2: st.metric("Pending Actions", "8", "-20%")
        with m3: st.metric("High Risk Cases", "5", "+2 new")
        with m4: st.metric("Investigation Accuracy", "92%", "+3% WoW")
            
        st.markdown("<br>", unsafe_allow_html=True)
        
        st.markdown("<h3>Recent Investigations</h3>", unsafe_allow_html=True)
        df = pd.DataFrame({
            "ID": ["INV-2026-1023", "INV-2026-1022", "INV-2026-1021", "INV-2026-1020"],
            "Customer": ["C456", "C879", "C341", "C019"],
            "Type": ["Fraud Signal", "Customer Report", "Device Anomaly", "Multiple Accounts"],
            "Risk Score": ["0.91", "0.67", "0.82", "0.78"],
            "Status": ["In Progress", "Need More Info", "Pending Review", "In Progress"],
            "Updated": ["2 min ago", "15 min ago", "1 hour ago", "2 hours ago"]
        })
        st.dataframe(df, use_container_width=True, hide_index=True)
        
        if st.button("Start New Investigation", type="primary"):
            st.session_state.current_view = "Investigations"
            st.rerun()

    # --- INVESTIGATION WORKSPACE ---
    elif st.session_state.current_view == 'Investigations':
        head_col1, head_col2 = st.columns([3, 1])
        with head_col1:
            st.markdown("""
            <div style="display: flex; align-items: center; gap: 1rem;">
                <h2 style="margin:0;">INV-2026-1023</h2>
                <span class="badge badge-high">🔥 High Risk</span>
            </div>
            """, unsafe_allow_html=True)
        with head_col2:
            st.markdown("<div style='text-align: right;'><span class='badge badge-progress'>🔄 In Progress</span></div>", unsafe_allow_html=True)
            
        st.markdown("<br>", unsafe_allow_html=True)
        
        tab_overview, tab_evidence, tab_graph, tab_analysis, tab_action, tab_timeline = st.tabs([
            "Overview", "Evidence", "Graph View", "Analysis", "Action", "Timeline"
        ])
        
        with tab_overview:
            col_info, col_agent = st.columns([1, 1.2])
            with col_info:
                with st.container(border=True):
                    st.markdown("### Case Information")
                    st.markdown("""
                    <table style="width: 100%; text-align: left; color: #E2E8F0; font-size: 0.9rem;">
                        <tr><td style="padding: 8px 0; color:#94A3B8;">Transaction ID</td><td>T1234567890</td></tr>
                        <tr><td style="padding: 8px 0; color:#94A3B8;">Customer</td><td>C456</td></tr>
                        <tr><td style="padding: 8px 0; color:#94A3B8;">Account</td><td>A789</td></tr>
                        <tr><td style="padding: 8px 0; color:#94A3B8;">Amount</td><td>₹78,000</td></tr>
                        <tr><td style="padding: 8px 0; color:#94A3B8;">Timestamp</td><td>2026-09-18 14:32</td></tr>
                        <tr><td style="padding: 8px 0; color:#94A3B8;">Risk Score</td><td style="color: #EF4444; font-weight: bold;">0.91</td></tr>
                        <tr><td style="padding: 8px 0; color:#94A3B8;">Status</td><td style="color: #6366F1;">In Progress</td></tr>
                    </table>
                    """, unsafe_allow_html=True)
                    
            with col_agent:
                with st.container(border=True):
                    st.markdown("### AI Agent Assistant")
                    chat_box = st.container(height=300)
                    with chat_box:
                        st.markdown("""
                        <div style="background: rgba(99, 102, 241, 0.1); border-left: 3px solid #6366F1; padding: 1rem; border-radius: 4px; margin-bottom: 1rem;">
                            <strong>Agent:</strong> I've started investigating this transaction. Here are the initial findings:
                            <ul style="margin-top: 0.5rem; margin-bottom: 0;">
                                <li>High-risk transaction amount</li>
                                <li>New device detected</li>
                                <li>Device linked to 3 other accounts</li>
                                <li>Previous fraud case associated with this device</li>
                            </ul>
                        </div>
                        """, unsafe_allow_html=True)
                        
                            if st.session_state.investigation_data:
                                for msg in st.session_state.agent_messages:
                                    # Highlight Blast Radius explicitly
                                    if "BLAST RADIUS" in msg:
                                        st.markdown(f"<div style='background: rgba(239, 68, 68, 0.15); border-left: 4px solid #EF4444; padding: 1rem; border-radius: 4px; margin-bottom: 1rem; color: #ffcccc;'><strong>🚨 {msg}</strong></div>", unsafe_allow_html=True)
                                    else:
                                        st.info(msg)
                    
                    if not st.session_state.investigation_data:
                        st.write("Would you like me to gather more evidence?")
                        if st.button("Yes, gather more evidence", type="primary", use_container_width=True):
                            with st.spinner("Agent is gathering graph evidence..."):
                                input_state = {
                                    "messages": [],
                                    "case_id": "INV-2026-1023",
                                    "target_transaction": "T1234567890",
                                    "risk_score": 0.91
                                }
                                messages = []
                                for output in fraud_agent.stream(input_state):
                                    for node, state in output.items():
                                        if "messages" in state and state["messages"]:
                                            last_msg = state["messages"][-1]
                                            if last_msg.type == "ai" and last_msg.content:
                                                messages.append(last_msg.content)
                                st.session_state.agent_messages = messages
                                st.session_state.investigation_data = True
                                st.rerun()
                    
        with tab_graph:
            st.markdown("### Graph View (TigerGraph)")
            node_x = [0, -1, 1, 0, -2, 2, 0]
            node_y = [2, 1, 1, 0, 0, 0, -1]
            node_text = ["C456<br>(Customer)", "A789<br>(Account)", "A891<br>(Account)", 
                         "D123<br>(Device)", "T12345<br>(Transaction)", "T67690<br>(Transaction)", "Case #732<br>(Confirmed Fraud)"]
            node_colors = ['#3B82F6', '#10B981', '#10B981', '#8B5CF6', '#F59E0B', '#F59E0B', '#EF4444']
            
            fig = go.Figure()
            edges = [(0,1), (0,2), (1,4), (1,3), (2,3), (2,5), (3,6)]
            for edge in edges:
                fig.add_trace(go.Scatter(x=[node_x[edge[0]], node_x[edge[1]]], y=[node_y[edge[0]], node_y[edge[1]]],
                                         mode='lines', line=dict(color='#2A3441', width=3)))
            
            fig.add_trace(go.Scatter(x=node_x, y=node_y, mode='markers+text', text=node_text,
                                     textposition="bottom center", textfont=dict(color="#E2E8F0"),
                                     marker=dict(size=40, color=node_colors, line=dict(width=2, color='rgba(255,255,255,0.2)'))))
            
            fig.update_layout(showlegend=False, margin=dict(b=0,l=0,r=0,t=0),
                              xaxis=dict(showgrid=False, zeroline=False, showticklabels=False),
                              yaxis=dict(showgrid=False, zeroline=False, showticklabels=False),
                              plot_bgcolor="rgba(0,0,0,0)", paper_bgcolor="rgba(0,0,0,0)", height=500)
            
            st.plotly_chart(fig, use_container_width=True)

        with tab_analysis:
            col_risk, col_indicators = st.columns([1, 1])
            with col_risk:
                with st.container(border=True):
                    st.markdown("### Risk Assessment")
                    fig_gauge = go.Figure(go.Indicator(
                        mode = "gauge+number", value = 89,
                        domain = {'x': [0, 1], 'y': [0, 1]},
                        title = {'text': "High Risk", 'font': {'color': '#EF4444'}},
                        gauge = {'axis': {'range': [None, 100], 'tickwidth': 1, 'tickcolor': "darkblue"},
                                 'bar': {'color': "#EF4444"},
                                 'bgcolor': "rgba(0,0,0,0)",
                                 'borderwidth': 2, 'bordercolor': "#2A3441",
                                 'steps': [
                                     {'range': [0, 40], 'color': 'rgba(16, 185, 129, 0.2)'},
                                     {'range': [40, 70], 'color': 'rgba(245, 158, 11, 0.2)'},
                                     {'range': [70, 100], 'color': 'rgba(239, 68, 68, 0.2)'}],
                                 }
                    ))
                    fig_gauge.update_layout(height=250, margin=dict(t=0,b=0,l=0,r=0), paper_bgcolor="rgba(0,0,0,0)", font=dict(color="#E2E8F0"))
                    st.plotly_chart(fig_gauge, use_container_width=True)
                    st.markdown("""**Uncertainty**<br><span style="color: #94A3B8; font-size: 0.9rem;">Customer authorization status unknown. Additional identity verification recommended.</span>""", unsafe_allow_html=True)

            with col_indicators:
                with st.container(border=True):
                    st.markdown("### Key Indicators")
                    st.markdown("""
                    <ul style="list-style: none; padding-left: 0; color: #E2E8F0; line-height: 2;">
                        <li>✅ High transaction risk score</li>
                        <li>✅ Shared device across multiple accounts</li>
                        <li>✅ Link to previous fraud case</li>
                        <li>✅ Unusual transaction amount</li>
                        <li>✅ New location</li>
                        <li>✅ Abnormal spending behavior</li>
                    </ul>
                    """, unsafe_allow_html=True)

        with tab_action:
            col_act1, col_act2 = st.columns([1, 1.2])
            with col_act1:
                st.markdown("### Recommended Actions")
                st.markdown("""
                <div style="border: 1px solid #EF4444; background: rgba(239, 68, 68, 0.1); padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
                    <div style="display: flex; justify-content: space-between;">
                        <strong style="color: #EF4444;">🛑 Block Transaction</strong>
                        <span class="badge badge-high">Recommended</span>
                    </div>
                    <div style="color: #94A3B8; font-size: 0.85rem; margin-top: 0.5rem;">High confidence of fraud</div>
                </div>
                <div style="border: 1px solid #2A3441; background: #151B2B; padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
                    <strong style="color: #F59E0B;">⚠️ Flag Account</strong>
                    <div style="color: #94A3B8; font-size: 0.85rem; margin-top: 0.5rem;">Monitor for suspicious activity</div>
                </div>
                """, unsafe_allow_html=True)
                
            with col_act2:
                with st.container(border=True):
                    st.markdown("### Action Details: Block Transaction")
                    st.markdown("""
                    **Risk Level:** <span style="color: #EF4444; font-weight: bold;">High</span><br>
                    **Confidence:** 89%<br><br>
                    **Reasoning**<br>
                    <span style="color: #94A3B8; font-size: 0.9rem;">Multiple fraud indicators, previous fraud connection, and high risk score suggest this is likely a fraudulent transaction.</span>
                    """, unsafe_allow_html=True)
                    st.markdown("<br>", unsafe_allow_html=True)
                    
                    c_btn1, c_btn2 = st.columns(2)
                    with c_btn1:
                        if st.button("Execute Action", type="primary", use_container_width=True):
                            st.success("Transaction Blocked Successfully.")
                    with c_btn2:
                        st.markdown("<div class='outline-btn'>", unsafe_allow_html=True)
                        st.button("Request Approval", use_container_width=True)
                        st.markdown("</div>", unsafe_allow_html=True)

        with tab_timeline:
            st.markdown("### Case Timeline")
            st.markdown("""
            <div style="border-left: 2px solid #2A3441; padding-left: 1.5rem; margin-left: 1rem; color: #E2E8F0;">
                <div style="margin-bottom: 1.5rem; position: relative;">
                    <div style="position: absolute; left: -2.1rem; background: #060913; padding: 0.2rem;">
                        <div style="width: 12px; height: 12px; border-radius: 50%; background: #6366F1;"></div>
                    </div>
                    <strong>Investigation Started</strong> <span style="color: #94A3B8; float: right;">2 min ago</span><br>
                    <span style="color: #94A3B8; font-size: 0.85rem;">Triggered by high risk transaction (score: 0.91)</span>
                </div>
                <div style="margin-bottom: 1.5rem; position: relative;">
                    <div style="position: absolute; left: -2.1rem; background: #060913; padding: 0.2rem;">
                        <div style="width: 12px; height: 12px; border-radius: 50%; background: #6366F1;"></div>
                    </div>
                    <strong>Evidence Collected</strong> <span style="color: #94A3B8; float: right;">5 min ago</span><br>
                    <span style="color: #94A3B8; font-size: 0.85rem;">Found 6 connected accounts via device D123</span>
                </div>
                <div style="margin-bottom: 1.5rem; position: relative;">
                    <div style="position: absolute; left: -2.1rem; background: #060913; padding: 0.2rem;">
                        <div style="width: 12px; height: 12px; border-radius: 50%; background: #EF4444;"></div>
                    </div>
                    <strong>Previous Case Match</strong> <span style="color: #94A3B8; float: right;">7 min ago</span><br>
                    <span style="color: #94A3B8; font-size: 0.85rem;">Device linked to Case #732 (confirmed fraud)</span>
                </div>
            </div>
            """, unsafe_allow_html=True)
