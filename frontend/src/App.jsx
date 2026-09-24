import React, { useState, useEffect, useRef } from 'react';
import Plot from 'react-plotly.js';
import { 
  Shield, LayoutDashboard, Search, Users, Activity, Settings, 
  AlertTriangle, ArrowRight, Play, CheckCircle2, ChevronRight, 
  Cpu, Network, FileText, Bot, AlertOctagon, ShieldAlert, Database, Download
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentView, setCurrentView] = useState('Dashboard');
  const [activeTab, setActiveTab] = useState('Overview');
  
  const [agentMessages, setAgentMessages] = useState([]);
  const [isInvestigating, setIsInvestigating] = useState(false);
  const [finalAction, setFinalAction] = useState("");
  const [isExecuting, setIsExecuting] = useState(false);
  const [isExecuted, setIsExecuted] = useState(() => {
    return localStorage.getItem('demo_case_resolved') === 'true';
  });
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showAllCases, setShowAllCases] = useState(false);
  
  const [activeCase, setActiveCase] = useState({
    id: 'INV-2026-1023',
    type: 'Device Anomaly',
    transaction: 'T1234567890',
    customer: 'C456',
    amount: '$78,000',
    risk: '0.91',
    riskLevel: 'High'
  });

  const chatContainerRef = useRef(null);

  // Auto-scroll chat
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [agentMessages]);

  const startInvestigation = async () => {
    setIsInvestigating(true);
    setAgentMessages([]);
    setFinalAction("");
    setActiveTab("Overview");
    
    try {
      const response = await fetch('http://localhost:8000/api/investigate/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          transaction_id: activeCase.transaction, 
          risk_score: parseFloat(activeCase.risk),
          amount: activeCase.amount,
          customer: activeCase.customer,
          type: activeCase.type
        })
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const events = chunk.split('\n\n');
        
        for (let evt of events) {
          if (evt.trim() === '') continue;
          if (evt.startsWith('data: ')) {
            const dataStr = evt.replace('data: ', '');
            try {
              const data = JSON.parse(dataStr);
              if (data.done) {
                setFinalAction(data.final_action);
                setActiveTab("Action Plan");
              } else {
                const msgContent = data.message || data.content;
                if (msgContent) {
                  setAgentMessages(prev => [...prev, msgContent]);
                }
              }
            } catch (e) {
              console.error('Parse error:', e, dataStr);
            }
          }
        }
      }
    } catch (error) {
      console.error('Investigation failed:', error);
      setAgentMessages(prev => [...prev, 'CRITICAL ERROR: Unable to reach TigerGraph Agent Engine.']);
    } finally {
      setIsInvestigating(false);
    }
  };

  const handleExecuteStrategy = () => {
    setIsExecuting(true);
    setTimeout(() => {
      setIsExecuting(false);
      setIsExecuted(true);
      localStorage.setItem(`case_${activeCase.id}_resolved`, 'true');
      
      // Automatically switch back to Overview/Chat so they can see the memory update
      setActiveTab('Overview');
      
      setTimeout(() => {
        let actionMsg = `ACTION: Executing Resolution Strategy. Initiating API call to Core Banking System to freeze transaction ${activeCase.transaction}.`;
        if (activeCase.type === 'Synthetic ID') {
           actionMsg = `ACTION: Executing Resolution Strategy. Updating Central CRM to flag Synthetic Identity cluster and suspending ${activeCase.customer}.`;
        } else if (activeCase.type === 'Location Mismatch') {
           actionMsg = `ACTION: Executing Resolution Strategy. Blocking ${activeCase.transaction} and locking card via Core Banking API.`;
        }
        setAgentMessages(prev => [...prev, actionMsg]);
      }, 500);
      
      setTimeout(() => {
        let expMsg = `EXPLANATION: Decision based on ${Math.round(parseFloat(activeCase.risk) * 100)}% risk score, extreme velocity anomaly, and multi-hop graph blast radius.`;
        if (activeCase.type === 'Synthetic ID') {
           expMsg = `EXPLANATION: Decision based on ${Math.round(parseFloat(activeCase.risk) * 100)}% risk score, shared SSN graph nodes, and failed step-up authentication.`;
        } else if (activeCase.type === 'Location Mismatch') {
           expMsg = `EXPLANATION: Decision based on ${Math.round(parseFloat(activeCase.risk) * 100)}% risk score, impossible travel radius, and distinct IP subnets.`;
        }
        setAgentMessages(prev => [...prev, expMsg]);
      }, 2000);
      
      setTimeout(() => {
        setAgentMessages(prev => [...prev, `MEMORY: Updating Case Memory. Knowledge graph vectorized. New embeddings stored for ${activeCase.customer}. Pattern indexed for future GraphRAG investigations. Case marked as CLOSED.`]);
      }, 4500);

    }, 1500);
  };

  const handleExportPDF = async () => {
    const element = document.getElementById('resolution-report-content');
    if (!element) return;
    
    const originalHeight = element.style.height;
    const originalOverflow = element.style.overflow;
    element.style.height = 'max-content';
    element.style.overflow = 'visible';
    
    try {
      const canvas = await html2canvas(element, {
        backgroundColor: '#060913',
        scale: 2,
        windowHeight: element.scrollHeight
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdfWidth = 210;
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      const pdf = new jsPDF('p', 'mm', [pdfWidth, pdfHeight]);
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`FraudLens_Report_${activeCase.id}.pdf`);
    } catch (err) {
      console.error("PDF generation failed", err);
      window.print();
    } finally {
      element.style.height = originalHeight;
      element.style.overflow = originalOverflow;
    }
  };
  

  const handleCaseSelect = (caseData) => {
    setActiveCase(caseData);
    const resolvedStatus = localStorage.getItem(`case_${caseData.id}_resolved`) === 'true';
    setIsExecuted(resolvedStatus);
    
    if (caseData.id !== 'INV-2026-1023') {
      setAgentMessages([]);
      setFinalAction("");
    }
    setCurrentView('Investigations');
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-900/20 via-[#060913] to-black text-gray-100 flex flex-col font-sans selection:bg-indigo-500/30">
        <nav className="flex justify-between items-center px-12 py-6 glass-panel border-x-0 border-t-0">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-indigo-500" />
            <h3 className="text-white font-bold text-2xl tracking-tight">FraudLens</h3>
          </div>
          <div className="hidden md:flex space-x-10 text-gray-400 font-medium text-sm">
            <span className="text-white cursor-pointer transition-colors">Product</span>
            <span className="cursor-pointer hover:text-white transition-colors">Solutions</span>
            <span className="cursor-pointer hover:text-white transition-colors">Graph Engine</span>
            <span className="cursor-pointer hover:text-white transition-colors">About</span>
          </div>
          <div className="flex items-center gap-4">
            <button className="px-5 py-2 text-sm font-semibold text-gray-300 hover:text-white transition-colors">Sign In</button>
            <button 
              onClick={() => setIsLoggedIn(true)}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold text-sm shadow-[0_0_20px_rgba(99,102,241,0.3)] transition-all flex items-center gap-2">
              Start Free Trial <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </nav>

        <div className="flex-1 flex flex-col lg:flex-row items-center px-12 lg:px-24">
          <div className="w-full lg:w-1/2 z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-panel border-indigo-500/30 text-indigo-400 text-xs font-semibold mb-6">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
              </span>
              TIGERGRAPH POWERED AI
            </div>
            <h1 className="text-6xl lg:text-7xl font-extrabold leading-[1.1] mb-6 tracking-tight text-white">
              See the Connections.<br/>
              <span className="bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 bg-clip-text text-transparent">Stop the Fraud.</span><br/>
            </h1>
            <p className="text-gray-400 text-lg lg:text-xl mb-10 max-w-xl leading-relaxed">
              Unleash the power of GraphRAG and multi-hop network intelligence to instantly detect, explain, and neutralize sophisticated fraud rings.
            </p>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsLoggedIn(true)}
                className="px-8 py-3.5 bg-white text-black hover:bg-gray-100 rounded-xl font-bold text-lg shadow-xl transition-transform hover:scale-105 flex items-center gap-2">
                Launch Workspace <ArrowRight className="w-5 h-5" />
              </button>
              <button className="px-8 py-3.5 glass-panel rounded-xl font-semibold text-lg hover:bg-white/10 transition-colors flex items-center gap-2">
                <Play className="w-5 h-5" /> Watch Demo
              </button>
            </div>
          </div>
          
          <div className="w-full lg:w-1/2 flex justify-center mt-16 lg:mt-0">
            <div className="orb-container">
              <div className="orb orb-1"></div>
              <div className="orb orb-2"></div>
              <div className="orb orb-3 flex items-center justify-center">
                <Network className="w-16 h-16 text-indigo-400 animate-pulse" />
              </div>
            </div>
          </div>
        </div>

        {/* Stats Footer */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 py-10 px-12 lg:px-24 glass-panel border-x-0 border-b-0 mt-auto">
          {[
            { label: 'Transactions Analyzed', value: '590K+' },
            { label: 'False Positives Reduced', value: '-84%' },
            { label: 'Threat Patterns Identified', value: '142' },
            { label: 'Investigation Speed', value: '< 2 mins' }
          ].map((stat, i) => (
            <div key={i} className="flex flex-col">
              <div className="text-3xl font-extrabold text-white mb-1">{stat.value}</div>
              <div className="text-gray-500 uppercase text-xs font-bold tracking-wider">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-[#060913] text-gray-100 font-sans overflow-hidden">
      {/* Dynamic Sidebar */}
      <div className="w-72 glass-panel border-y-0 border-l-0 flex flex-col z-20">
        <div className="p-6 flex items-center gap-3 border-b border-white/5">
          <Shield className="w-7 h-7 text-indigo-500" />
          <h2 className="text-white text-xl font-bold tracking-tight">FraudLens</h2>
        </div>
        
        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 px-3">Main Menu</div>
          {[
            { id: 'Dashboard', icon: LayoutDashboard },
            { id: 'Investigations', icon: Search },
            { id: 'Graph Explorer', icon: Network },
            { id: 'Customers', icon: Users },
            { id: 'Policies', icon: ShieldAlert },
            { id: 'Settings', icon: Settings }
          ].map(item => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button 
                key={item.id} 
                onClick={() => setCurrentView(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive 
                    ? 'bg-indigo-500/15 text-indigo-400 neon-border' 
                    : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                }`}>
                <Icon className="w-5 h-5" />
                {item.id}
              </button>
            );
          })}
        </div>

        <div className="p-4 border-t border-white/5 bg-black/20">
          <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 cursor-pointer transition-colors">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
              <span className="font-bold text-white text-sm">A</span>
            </div>
            <div className="flex-1 overflow-hidden">
              <div className="text-sm font-bold text-white truncate">Analyst</div>
              <div className="text-xs text-indigo-400 font-medium">Tier 3 Investigator</div>
            </div>
            <Settings className="w-4 h-4 text-gray-500" />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative min-w-0">
        {/* Background glow effects */}
        <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-900/20 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-blue-900/10 blur-[120px] pointer-events-none" />

        <div className="flex-1 overflow-y-auto p-8 z-10 min-h-0 relative">
          {currentView === 'Dashboard' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <header className="mb-8">
                <h1 className="text-3xl font-extrabold text-white mb-2">Command Center</h1>
                <p className="text-gray-400">Real-time threat monitoring and active investigations.</p>
              </header>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {[
                  { label: 'Active Alerts', value: '24', trend: '+12%', color: 'text-red-400', bg: 'bg-red-400/10' },
                  { label: 'Pending Actions', value: '8', trend: '-2', color: 'text-orange-400', bg: 'bg-orange-400/10' },
                  { label: 'Graph Entities', value: '1.2M', trend: '+5k', color: 'text-indigo-400', bg: 'bg-indigo-400/10' },
                  { label: 'Agent Accuracy', value: '96%', trend: '+1.2%', color: 'text-green-400', bg: 'bg-green-400/10' }
                ].map((stat, i) => (
                  <div key={i} className="glass-card p-5">
                    <div className="text-gray-400 uppercase text-xs font-bold mb-3 flex items-center justify-between">
                      {stat.label}
                      <Activity className={`w-4 h-4 ${stat.color}`} />
                    </div>
                    <div className="flex items-end gap-3">
                      <div className="text-3xl font-extrabold text-white">{stat.value}</div>
                      <div className={`text-xs font-bold px-2 py-1 rounded-md mb-1 ${stat.bg} ${stat.color}`}>
                        {stat.trend}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="glass-card overflow-hidden">
                <div className="p-5 border-b border-white/5 flex justify-between items-center bg-black/20">
                  <h3 className="font-bold text-lg text-white flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-orange-400" />
                    Priority Investigations
                  </h3>
                  <button 
                    onClick={() => setShowAllCases(!showAllCases)}
                    className="text-sm font-semibold text-indigo-400 hover:text-indigo-300">
                    {showAllCases ? 'Show Less' : 'View All'}
                  </button>
                </div>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-black/10 text-gray-400 text-xs uppercase tracking-wider font-semibold">
                      <th className="px-6 py-4 border-b border-white/5">Case ID</th>
                      <th className="px-6 py-4 border-b border-white/5">Trigger Event</th>
                      <th className="px-6 py-4 border-b border-white/5">Risk Score</th>
                      <th className="px-6 py-4 border-b border-white/5">AI Status</th>
                      <th className="px-6 py-4 border-b border-white/5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    <tr className="hover:bg-white/[0.02] transition-colors group cursor-pointer" onClick={() => handleCaseSelect({
                      id: 'INV-2026-1023',
                      type: 'Device Anomaly',
                      transaction: 'T1234567890',
                      customer: 'C456',
                      amount: '$78,000',
                      risk: '0.91',
                      riskLevel: 'High'
                    })}>
                      <td className="px-6 py-4 border-b border-white/5 font-semibold text-white">INV-2026-1023</td>
                      <td className="px-6 py-4 border-b border-white/5">
                        <div className="font-medium text-gray-200">Device Anomaly</div>
                        <div className="text-xs text-gray-500">T1234567890 &bull; $78,000</div>
                      </td>
                      <td className="px-6 py-4 border-b border-white/5">
                        {localStorage.getItem(`case_INV-2026-1023_resolved`) === 'true' ? (
                          <span className="px-2.5 py-1 rounded-md bg-green-500/10 text-green-400 border border-green-500/20 font-bold">Closed</span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-md bg-red-500/10 text-red-400 border border-red-500/20 font-bold">0.91 High</span>
                        )}
                      </td>
                      <td className="px-6 py-4 border-b border-white/5">
                        {localStorage.getItem(`case_INV-2026-1023_resolved`) === 'true' ? (
                          <span className="flex items-center gap-1.5 text-green-400 font-medium">
                            <CheckCircle2 className="w-4 h-4" /> Resolved by AI
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-indigo-400 font-medium">
                            <Cpu className="w-4 h-4" /> Ready for review
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 border-b border-white/5 text-right">
                        <button className="opacity-0 group-hover:opacity-100 p-2 rounded-lg bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500 hover:text-white transition-all">
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                    {/* Mock rows for aesthetics */}
                    {(showAllCases ? [
                      { id: 'INV-2026-1022', type: 'Velocity Spike', amt: '$114,200', risk: '0.74', riskCol: 'text-orange-400', bg: 'bg-orange-500/10', bdr: 'border-orange-500/20', status: 'Needs Approval', sCol: 'text-amber-400' },
                      { id: 'INV-2026-1021', type: 'Location Mismatch', amt: '$3,500', risk: '0.42', riskCol: 'text-yellow-400', bg: 'bg-yellow-500/10', bdr: 'border-yellow-500/20', status: 'Processing Graph', sCol: 'text-indigo-400' },
                      { id: 'INV-2026-1020', type: 'Synthetic ID', amt: '$45,000', risk: '0.88', riskCol: 'text-red-400', bg: 'bg-red-500/10', bdr: 'border-red-500/20', status: 'Ready for review', sCol: 'text-indigo-400' },
                      { id: 'INV-2026-1019', type: 'Account Takeover', amt: '$12,000', risk: '0.95', riskCol: 'text-red-400', bg: 'bg-red-500/10', bdr: 'border-red-500/20', status: 'Executing Action', sCol: 'text-pink-400' },
                      { id: 'INV-2026-1018', type: 'Card Testing', amt: '$40', risk: '0.21', riskCol: 'text-green-400', bg: 'bg-green-500/10', bdr: 'border-green-500/20', status: 'False Positive', sCol: 'text-gray-500' },
                      { id: 'INV-2026-1017', type: 'Mule Account', amt: '$9,900', risk: '0.81', riskCol: 'text-red-400', bg: 'bg-red-500/10', bdr: 'border-red-500/20', status: 'Awaiting Agent', sCol: 'text-gray-500' },
                    ] : [
                      { id: 'INV-2026-1022', type: 'Velocity Spike', amt: '$114,200', risk: '0.74', riskCol: 'text-orange-400', bg: 'bg-orange-500/10', bdr: 'border-orange-500/20', status: 'Needs Approval', sCol: 'text-amber-400' },
                      { id: 'INV-2026-1021', type: 'Location Mismatch', amt: '$3,500', risk: '0.42', riskCol: 'text-yellow-400', bg: 'bg-yellow-500/10', bdr: 'border-yellow-500/20', status: 'Processing Graph', sCol: 'text-indigo-400' },
                    ]).map((row, i) => (
                      <tr key={i} className="hover:bg-white/[0.02] transition-colors cursor-pointer group" onClick={() => handleCaseSelect({
                        id: row.id,
                        type: row.type,
                        transaction: 'T' + Math.floor(Math.random() * 10000000).toString().padStart(7, '0'),
                        customer: 'C' + Math.floor(Math.random() * 1000).toString().padStart(3, '0'),
                        amount: row.amt,
                        risk: row.risk,
                        riskLevel: parseFloat(row.risk) > 0.8 ? 'High' : 'Medium'
                      })}>
                        <td className="px-6 py-4 border-b border-white/5 font-semibold text-gray-300 group-hover:text-white transition-colors">{row.id}</td>
                        <td className="px-6 py-4 border-b border-white/5">
                          <div className="font-medium text-gray-300">{row.type}</div>
                          <div className="text-xs text-gray-500">T0000000{i} &bull; {row.amt}</div>
                        </td>
                        <td className="px-6 py-4 border-b border-white/5">
                          <span className={`px-2.5 py-1 rounded-md ${row.bg} ${row.riskCol} border ${row.bdr} font-bold`}>{row.risk}</span>
                        </td>
                        <td className={`px-6 py-4 border-b border-white/5 text-xs font-semibold ${row.sCol}`}>
                          {row.status}
                        </td>
                        <td className="px-6 py-4 border-b border-white/5 text-right"></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {currentView === 'Investigations' && (
            <div className="animate-in fade-in zoom-in-95 duration-300 absolute inset-8 flex flex-col">
              {/* Header */}
              <div className="flex justify-between items-start mb-6">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h1 className="text-3xl font-extrabold text-white">{activeCase.id}</h1>
                    {isExecuted ? (
                      <span className="px-3 py-1 bg-green-500/10 text-green-400 border border-green-500/20 rounded-lg text-xs font-bold uppercase flex items-center gap-1.5 shadow-[0_0_15px_rgba(34,197,94,0.2)]">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Closed - Resolved
                      </span>
                    ) : (
                      <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase flex items-center gap-1.5 shadow-[0_0_15px_rgba(239,68,68,0.2)] ${activeCase.riskLevel === 'High' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-orange-500/10 text-orange-400 border border-orange-500/20'}`}>
                        <AlertOctagon className="w-3.5 h-3.5" /> {activeCase.riskLevel} Risk
                      </span>
                    )}
                  </div>
                  <p className="text-gray-400 flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-green-400" /> Opened 14 mins ago
                  </p>
                </div>
                
                <div className="flex bg-black/40 p-1 rounded-xl border border-white/10 overflow-x-auto">
                  {(isExecuted ? ['Overview', 'Graph Context', 'Action Plan', 'Resolution Summary'] : ['Overview', 'Graph Context', 'Action Plan']).map(tab => (
                    <button 
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`px-6 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
                        activeTab === tab ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                      }`}>
                      {tab}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dynamic Content based on Tab */}
              <div className="flex-1 flex gap-6 overflow-hidden min-h-0">
                {/* Fixed Agent Sidebar (Always visible context) */}
                <div className="w-1/3 flex flex-col gap-4 min-h-0">
                  <div className="glass-card p-5 border-t-4 border-t-indigo-500 shrink-0">
                    <h3 className="font-bold text-white mb-4 flex items-center gap-2"><FileText className="w-4 h-4 text-indigo-400"/> Case Details</h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between pb-2 border-b border-white/5"><span className="text-gray-500">Target Txn</span><span className="font-mono text-gray-200">{activeCase.transaction}</span></div>
                      <div className="flex justify-between pb-2 border-b border-white/5"><span className="text-gray-500">Customer</span><span className="text-gray-200">{activeCase.customer}</span></div>
                      <div className="flex justify-between pb-2 border-b border-white/5"><span className="text-gray-500">Amount</span><span className="text-gray-200">{activeCase.amount}</span></div>
                      <div className="flex justify-between pb-2 border-b border-white/5"><span className="text-gray-500">ML Risk Score</span><span className={`font-bold ${parseFloat(activeCase.risk) > 0.8 ? 'text-red-400' : 'text-orange-400'}`}>{activeCase.risk}</span></div>
                    </div>
                  </div>

                  <div className="glass-card flex-1 flex flex-col overflow-hidden relative min-h-0">
                    <div className="p-4 border-b border-white/5 bg-black/20 flex items-center gap-2 shrink-0">
                      <Bot className="w-5 h-5 text-indigo-400" />
                      <h3 className="font-bold text-white">AI Investigator</h3>
                      {isInvestigating && <span className="ml-auto flex h-2 w-2 relative"><span className="animate-ping absolute h-full w-full rounded-full bg-indigo-400 opacity-75"></span><span className="relative rounded-full h-2 w-2 bg-indigo-500"></span></span>}
                    </div>
                    
                    <div ref={chatContainerRef} className="flex-1 p-4 overflow-y-auto space-y-4 text-sm bg-gradient-to-b from-transparent to-black/20 min-h-0">
                      <div className="bg-indigo-500/10 border border-indigo-500/20 p-3 rounded-xl rounded-tl-sm text-gray-200">
                        I am ready to analyze transaction {activeCase.transaction} using GraphRAG and TigerGraph.
                      </div>
                      
                      {agentMessages.map((msg, idx) => {
                        const isBlast = msg.includes('BLAST RADIUS');
                        return (
                          <div key={idx} className={`animate-in fade-in slide-in-from-bottom-2 p-4 rounded-xl rounded-tl-sm border ${
                            isBlast 
                              ? 'bg-red-500/10 border-red-500/50 text-red-200 neon-border-red shadow-lg shadow-red-500/10' 
                              : 'bg-white/5 border-white/10 text-gray-300'
                          }`}>
                            {isBlast ? (
                              <div>
                                <div className="flex items-center gap-2 text-red-400 font-bold mb-2 uppercase tracking-wide text-xs">
                                  <AlertTriangle className="w-4 h-4" /> Network Threat Detected
                                </div>
                                <div className="font-medium">{msg.replace('dYs" ', '')}</div>
                              </div>
                            ) : (
                              <div className="prose prose-invert prose-sm max-w-none leading-relaxed">
                                {msg}
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {isInvestigating && (
                        <div className="flex items-center gap-2 text-indigo-400 p-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce"></div>
                          <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{animationDelay: '0.1s'}}></div>
                          <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{animationDelay: '0.2s'}}></div>
                        </div>
                      )}
                    </div>

                    {!isInvestigating && agentMessages.length === 0 && (
                      <div className="p-4 border-t border-white/5 bg-black/40 shrink-0">
                        <button 
                          onClick={startInvestigation}
                          className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors">
                          <Play className="w-4 h-4 fill-current" /> Execute Graph Analysis
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Tab Content */}
                <div className="flex-1 glass-card overflow-hidden flex flex-col relative min-h-0">
                  {activeTab === 'Graph Context' && (
                    <div className="flex-1 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-opacity-5">
                      <div className="absolute top-4 left-4 z-10 glass-panel px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 text-white">
                        <Network className="w-4 h-4 text-indigo-400" /> Multi-hop Network View
                      </div>
                      <Plot
                        data={[
                          (() => {
                            if (activeCase.type === 'Synthetic ID') {
                              return {
                                x: [0, -1, 1, 0, -1.5, 1.5],
                                y: [2, 1, 1, 0, -1, -1],
                                mode: 'markers+lines+text',
                                text: [activeCase.customer, "SSN-9982", "SSN-4412", activeCase.transaction, "Fake Address 1", "Dormant Acc"],
                                textposition: "bottom center",
                                marker: { 
                                  size: [40, 35, 35, 50, 30, 30], 
                                  color: ['#3B82F6', '#8B5CF6', '#8B5CF6', '#EF4444', '#F59E0B', '#10B981'],
                                  line: { width: 3, color: 'rgba(255,255,255,0.8)' }
                                },
                                line: { color: 'rgba(99,102,241,0.3)', width: 2 }
                              };
                            } else if (activeCase.type === 'Location Mismatch') {
                              return {
                                x: [0, -2, 2, 0, 0],
                                y: [2, 0, 0, -1, -2],
                                mode: 'markers+lines+text',
                                text: [activeCase.customer, "IP: New York", "IP: London", activeCase.transaction, "Known VPN Proxy"],
                                textposition: "bottom center",
                                marker: { 
                                  size: [40, 35, 35, 50, 45], 
                                  color: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#EF4444'],
                                  line: { width: 3, color: 'rgba(255,255,255,0.8)' }
                                },
                                line: { color: 'rgba(99,102,241,0.3)', width: 2 }
                              };
                            } else if (activeCase.type === 'Velocity Spike') {
                              return {
                                x: [0, -1, 0, 1, -2, 2, -1, 1],
                                y: [2, 1, 1, 1, 0, 0, -1, -1],
                                mode: 'markers+lines+text',
                                text: [activeCase.customer, "Gateway A", "Gateway B", "Gateway C", "Txn 1", "Txn 2", "Txn 3", activeCase.transaction],
                                textposition: "bottom center",
                                marker: { 
                                  size: [40, 30, 30, 30, 25, 25, 25, 50], 
                                  color: ['#3B82F6', '#F59E0B', '#F59E0B', '#F59E0B', '#10B981', '#10B981', '#10B981', '#EF4444'],
                                  line: { width: 3, color: 'rgba(255,255,255,0.8)' }
                                },
                                line: { color: 'rgba(99,102,241,0.3)', width: 2 }
                              };
                            }
                            // Default / Device Anomaly
                            return {
                              x: [0, -1, 1, 0, -2, 2, 0],
                              y: [2, 1, 1, 0, 0, 0, -1],
                              mode: 'markers+lines+text',
                              text: [activeCase.customer, "A789", "A891", "D123 (Suspicious Device)", activeCase.transaction, "T67690", "Prior Fraud Case"],
                              textposition: "bottom center",
                              marker: { 
                                size: [40, 35, 35, 50, 30, 30, 45], 
                                color: ['#3B82F6', '#10B981', '#10B981', '#8B5CF6', '#F59E0B', '#F59E0B', '#EF4444'],
                                line: { width: 3, color: 'rgba(255,255,255,0.8)' }
                              },
                              line: { color: 'rgba(99,102,241,0.3)', width: 2 }
                            };
                          })()
                        ]}
                        layout={{
                          paper_bgcolor: 'rgba(0,0,0,0)',
                          plot_bgcolor: 'rgba(0,0,0,0)',
                          xaxis: { visible: false, range: [-2.5, 2.5] },
                          yaxis: { visible: false, range: [-1.5, 2.5] },
                          margin: { t:20, b:20, l:20, r:20 },
                          showlegend: false,
                          hovermode: 'closest'
                        }}
                        config={{ displayModeBar: false, responsive: true }}
                        style={{ width: '100%', height: '100%' }}
                      />
                    </div>
                  )}

                  {activeTab === 'Overview' && (
                    <div className="p-8 h-full overflow-y-auto">
                      <div className="max-w-2xl mx-auto space-y-8">
                        <div className="text-center">
                          <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full border-2 mb-4 ${activeCase.riskLevel === 'High' ? 'bg-red-500/10 border-red-500/20' : 'bg-orange-500/10 border-orange-500/20'}`}>
                            <span className={`text-3xl font-bold ${activeCase.riskLevel === 'High' ? 'text-red-500' : 'text-orange-500'}`}>{Math.round(parseFloat(activeCase.risk) * 100)}</span>
                          </div>
                          <h2 className="text-2xl font-bold text-white mb-2">{activeCase.riskLevel === 'High' ? 'Critical Risk Detected' : 'Elevated Risk Detected'}</h2>
                          <p className="text-gray-400 text-sm">Vesta ML models flagged this transaction due to {activeCase.type.toLowerCase()} patterns.</p>
                        </div>
                        
                        <div className="glass-panel p-6 rounded-2xl">
                          <h3 className="font-bold text-white mb-4 border-b border-white/10 pb-2">Pre-Investigation Flags</h3>
                          <ul className="space-y-3 text-sm text-gray-300">
                            <li className="flex gap-3"><AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0"/> Transaction amount ({activeCase.amount}) is heavily deviating from user baseline.</li>
                            {activeCase.type === 'Synthetic ID' ? (
                                <li className="flex gap-3"><AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0"/> Missing credit history matching declared PII.</li>
                            ) : activeCase.type === 'Location Mismatch' ? (
                                <li className="flex gap-3"><AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0"/> Impossible travel detected between recent logins.</li>
                            ) : (
                                <li className="flex gap-3"><AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0"/> Geo-location mismatch (Login from distinct IP subnet).</li>
                            )}
                            <li className="flex gap-3"><AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0"/> Device fingerprint generated for the first time on this account.</li>
                          </ul>
                        </div>
                        
                        <div className="text-center pt-4">
                          <button 
                            onClick={() => setActiveTab('Graph Context')}
                            className="text-indigo-400 hover:text-indigo-300 font-semibold text-sm flex items-center justify-center gap-1 mx-auto transition-colors">
                            Explore Graph Connections <ArrowRight className="w-4 h-4"/>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'Action Plan' && (
                    <div className="p-8 h-full overflow-y-auto">
                       <h2 className="text-2xl font-bold text-white mb-6">Resolution Strategy</h2>
                       {finalAction === "" ? (
                         <div className="h-40 flex items-center justify-center border-2 border-dashed border-white/10 rounded-xl text-gray-500">
                           Run the AI Investigator to generate an action plan.
                         </div>
                       ) : (
                         <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                           <div className="glass-panel p-6 rounded-2xl neon-border-red bg-red-500/5">
                             <div className="flex justify-between items-start mb-4">
                               <div>
                                 <h3 className="text-xl font-bold text-red-400 flex items-center gap-2"><ShieldAlert className="w-6 h-6"/> Recommended Action</h3>
                                 <p className="text-gray-400 text-sm mt-1">AI-driven strategy based on GraphRAG Policies</p>
                               </div>
                               <span className="bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold tracking-widest">PRIMARY ACTION</span>
                             </div>
                             
                             <div className="prose prose-invert max-w-none text-gray-300 my-6 p-4 bg-black/20 rounded-xl border border-white/5">
                               {finalAction.split('\n').map((line, i) => (
                                 <p key={i} className="mb-2">{line}</p>
                               ))}
                             </div>
                             
                             <div className="flex gap-4 mt-8">
                               {isExecuted ? (
                                 <button disabled className="flex-1 bg-green-500/20 text-green-400 border border-green-500/50 py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(34,197,94,0.2)]">
                                   <CheckCircle2 className="w-5 h-5" /> Strategy Executed
                                 </button>
                               ) : (
                                 <button 
                                   onClick={handleExecuteStrategy}
                                   disabled={isExecuting}
                                   className="flex-1 bg-red-600 hover:bg-red-500 text-white py-3 rounded-xl font-bold shadow-[0_0_20px_rgba(239,68,68,0.3)] transition-all flex items-center justify-center gap-2">
                                   {isExecuting ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : "Execute Strategy"}
                                 </button>
                               )}
                               <button className="flex-1 bg-white/10 hover:bg-white/20 text-white py-3 rounded-xl font-bold transition-all border border-white/5">
                                 Escalate to L2
                               </button>
                             </div>
                             {isExecuted && (
                               <div className="mt-8 space-y-3 animate-in fade-in slide-in-from-top-4">
                                 <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 border-t border-white/10 pt-6">Execution Log & Memory Update</div>
                                 
                                 <div className="flex items-center gap-4 glass-panel p-4 rounded-xl border border-green-500/20">
                                   <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center text-green-400"><Database className="w-4 h-4"/></div>
                                   <div className="flex-1">
                                     <div className="font-bold text-white">Updating Case Memory</div>
                                     <div className="text-xs text-gray-400">TigerGraph GSQL &bull; Vectors stored &bull; CRM Case #{activeCase.id} Closed</div>
                                   </div>
                                 </div>
                             
                                 <div className="flex items-center gap-4 glass-panel p-4 rounded-xl border border-green-500/20">
                                   <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center text-green-400"><Shield className="w-4 h-4"/></div>
                                   <div className="flex-1">
                                     <div className="font-bold text-white">
                                       {activeCase.type === 'Synthetic ID' ? 'Flagging Identity Cluster' : activeCase.type === 'Location Mismatch' ? 'Blocking Geolocation & Card' : 'Freezing Accounts & Cards'}
                                     </div>
                                     <div className="text-xs text-gray-400">
                                       {activeCase.type === 'Synthetic ID' ? 'CRM API • SSNs Blocklisted • Accounts Suspended' : 'Core Banking API • Transaction Blocked • Card Suspended'}
                                     </div>
                                   </div>
                                 </div>
                             
                                 <div className="flex items-center gap-4 glass-panel p-4 rounded-xl border border-green-500/20">
                                   <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center text-green-400"><CheckCircle2 className="w-4 h-4"/></div>
                                   <div className="flex-1">
                                     <div className="font-bold text-white">Customer Notification</div>
                                     <div className="text-xs text-gray-400">Twilio SMS API &bull; Fraud Alert Message Delivered</div>
                                   </div>
                                 </div>
                               </div>
                             )}
                           </div>
                         </div>
                       )}
                    </div>
                  )}
                  {activeTab === 'Resolution Summary' && (
                    <div id="resolution-report-content" className="p-8 h-full overflow-y-auto animate-in fade-in zoom-in-95">
                      <div className="flex justify-between items-end mb-6 border-b border-white/10 pb-4">
                        <div>
                          <h2 className="text-2xl font-bold text-white">Investigation Resolution Report</h2>
                          <p className="text-gray-400 mt-1">Generated by FraudLens AI Agent</p>
                        </div>
                        <button 
                          onClick={handleExportPDF}
                          data-html2canvas-ignore="true"
                          className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2 rounded-xl font-bold shadow-lg transition-all flex items-center gap-2">
                          <Download className="w-4 h-4" /> Export PDF
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-6 mb-8">
                        <div className="glass-panel p-6 rounded-2xl">
                          <h3 className="text-gray-400 font-bold mb-4 uppercase tracking-wider text-xs">Risk Exposure Mitigation</h3>
                          <Plot
                             data={[{
                               x: ['Before Action', 'After Action'],
                               y: [Math.round(parseFloat(activeCase.risk) * 100), 5],
                               type: 'bar',
                               marker: { color: ['#ef4444', '#22c55e'] }
                             }]}
                             layout={{
                               paper_bgcolor: 'rgba(0,0,0,0)',
                               plot_bgcolor: 'rgba(0,0,0,0)',
                               font: { color: '#9ca3af' },
                               margin: { t: 10, b: 30, l: 30, r: 10 },
                               height: 200,
                               autosize: true
                             }}
                             useResizeHandler={true}
                             style={{width: '100%', height: '100%'}}
                             config={{ displayModeBar: false }}
                          />
                        </div>
                        <div className="glass-panel p-6 rounded-2xl">
                          <h3 className="text-gray-400 font-bold mb-4 uppercase tracking-wider text-xs">Network Threat Activity (24h)</h3>
                          <Plot
                             data={[{
                               x: ['12:00', '14:00', '16:00', '18:00', '20:00', '22:00'],
                               y: [12, 18, 45, Math.round(parseFloat(activeCase.risk) * 100), 10, 0],
                               type: 'scatter',
                               mode: 'lines+markers',
                               line: { color: '#6366f1', width: 3 },
                               marker: { size: 8 }
                             }]}
                             layout={{
                               paper_bgcolor: 'rgba(0,0,0,0)',
                               plot_bgcolor: 'rgba(0,0,0,0)',
                               font: { color: '#9ca3af' },
                               margin: { t: 10, b: 30, l: 30, r: 10 },
                               height: 200,
                               autosize: true
                             }}
                             useResizeHandler={true}
                             style={{width: '100%', height: '100%'}}
                             config={{ displayModeBar: false }}
                          />
                        </div>
                      </div>
                      
                      <div className="glass-panel p-6 rounded-2xl border-l-4 border-l-green-500">
                         <h3 className="text-white font-bold mb-4 text-lg">Final Investigation Summary</h3>
                         <div className="prose prose-invert prose-sm text-gray-300 max-w-none">
                           <p><strong>Case ID:</strong> {activeCase.id} &nbsp;|&nbsp; <strong>Resolution Date:</strong> {new Date().toLocaleDateString()} &nbsp;|&nbsp; <strong>Analyst:</strong> Analyst</p>
                           <p className="mt-4 leading-relaxed">
                             The AI Investigator identified a massive anomaly (<strong>Risk Score: {activeCase.risk}</strong>) for transaction {activeCase.transaction}. Using TigerGraph GraphRAG, the system mapped a blast radius connecting Customer {activeCase.customer} to 4 known fraudulent nodes via shared IP and device fingerprints. 
                           </p>
                           <p className="mt-2 leading-relaxed">
                             The resolution strategy was successfully executed, freezing the account and preventing <strong>{activeCase.amount}</strong> in potential losses. Case memory has been vectorized and embedded back into the knowledge graph to inform future policy generation.
                           </p>
                         </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {currentView === 'Graph Explorer' && (
            <div className="absolute inset-8 flex flex-col animate-in fade-in duration-300">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-3"><Network className="text-indigo-400" /> Interactive Graph Explorer</h2>
                <div className="flex gap-2">
                  <input type="text" placeholder="Search entity ID..." className="bg-gray-800/80 border border-gray-700 rounded-xl px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500" />
                  <button className="bg-indigo-600 hover:bg-indigo-700 px-5 py-2 rounded-xl text-white font-semibold shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2">
                    <Search className="w-4 h-4" /> Query
                  </button>
                </div>
              </div>
              <div className="flex-1 glass-panel rounded-2xl overflow-hidden relative border border-gray-800/50">
                <div className="absolute top-4 left-4 z-10 glass-panel p-4 rounded-xl border border-gray-700/50 shadow-xl backdrop-blur-md">
                  <div className="font-bold text-white mb-3 text-sm tracking-wider uppercase">Graph Legend</div>
                  <div className="flex items-center gap-3 mb-2"><div className="w-3 h-3 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]"></div> <span className="text-gray-300 text-sm">Transaction</span></div>
                  <div className="flex items-center gap-3 mb-2"><div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div> <span className="text-gray-300 text-sm">Account Node</span></div>
                  <div className="flex items-center gap-3"><div className="w-3 h-3 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]"></div> <span className="text-gray-300 text-sm">Device / IP</span></div>
                </div>
                <Plot
                  data={[{
                    x: [1, 2, 3, 2.5, 1.5, 4, 3.5, 4.5, 1.2, 2.8],
                    y: [2, 1, 2, 3, 3, 1.5, 2.5, 2.8, 1.2, 1.1],
                    mode: 'markers+lines',
                    marker: { size: [35, 25, 25, 18, 18, 30, 18, 15, 15, 20], color: ['#6366f1', '#10b981', '#10b981', '#f43f5e', '#f43f5e', '#10b981', '#f43f5e', '#f43f5e', '#f43f5e', '#10b981'] },
                    line: { color: '#334155', width: 2 }
                  }]}
                  layout={{
                    paper_bgcolor: 'rgba(0,0,0,0)',
                    plot_bgcolor: 'rgba(0,0,0,0)',
                    xaxis: { showgrid: false, zeroline: false, showticklabels: false },
                    yaxis: { showgrid: false, zeroline: false, showticklabels: false },
                    margin: { l: 0, r: 0, t: 0, b: 0 },
                    autosize: true
                  }}
                  useResizeHandler={true}
                  style={{ width: '100%', height: '100%' }}
                  config={{ displayModeBar: false }}
                />
              </div>
            </div>
          )}

          {currentView === 'Customers' && (
            <div className="absolute inset-8 flex flex-col animate-in fade-in duration-300">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3"><Users className="text-indigo-400" /> Customer Risk Directory</h2>
              <div className="glass-panel rounded-2xl overflow-hidden flex-1 border border-gray-800/50">
                <table className="w-full text-left text-gray-300">
                  <thead className="bg-gray-800/80 border-b border-gray-700/50">
                    <tr>
                      <th className="px-6 py-5 font-semibold text-gray-400">Customer ID</th>
                      <th className="px-6 py-5 font-semibold text-gray-400">Name</th>
                      <th className="px-6 py-5 font-semibold text-gray-400">Risk Segment</th>
                      <th className="px-6 py-5 font-semibold text-gray-400">Last Active</th>
                      <th className="px-6 py-5 font-semibold text-gray-400">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/50">
                    {[
                      { id: 'C-99201', name: 'Alice Walker', risk: 'Low', date: '2 mins ago' },
                      { id: 'C-88192', name: 'Frank Underhill', risk: 'High', date: '1 hour ago' },
                      { id: 'C-77281', name: 'Sarah Connor', risk: 'Medium', date: '5 hours ago' },
                      { id: 'C-66372', name: 'John Doe', risk: 'Critical', date: 'Just now' },
                      { id: 'C-55463', name: 'Michael Smith', risk: 'Low', date: '1 day ago' },
                    ].map((c, i) => (
                      <tr key={i} className="hover:bg-gray-800/40 transition-colors">
                        <td className="px-6 py-5 font-mono text-indigo-400">{c.id}</td>
                        <td className="px-6 py-5 text-white font-medium">{c.name}</td>
                        <td className="px-6 py-5">
                          <span className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border ${
                            c.risk === 'Low' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                            c.risk === 'Medium' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                            'bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-[0_0_10px_rgba(244,63,94,0.2)]'
                          }`}>
                            {c.risk} Risk
                          </span>
                        </td>
                        <td className="px-6 py-5 text-gray-500">{c.date}</td>
                        <td className="px-6 py-5">
                          <button onClick={() => setSelectedCustomer(c)} className="text-indigo-400 hover:text-indigo-300 font-semibold text-sm transition-colors">
                            View Profile &rarr;
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {selectedCustomer && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in">
                  <div className="glass-panel p-8 rounded-2xl max-w-md w-full border border-gray-700/50 relative shadow-2xl">
                    <button 
                      onClick={() => setSelectedCustomer(null)}
                      className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold mb-4">
                      {selectedCustomer.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <h3 className="text-2xl font-bold text-white">{selectedCustomer.name}</h3>
                    <p className="text-indigo-400 font-mono mt-1 mb-6">{selectedCustomer.id}</p>
                    
                    <div className="space-y-4 mb-8">
                      <div className="flex justify-between border-b border-gray-800 pb-3">
                        <span className="text-gray-400">Current Risk Segment</span>
                        <span className={`font-bold ${selectedCustomer.risk === 'Low' ? 'text-emerald-400' : selectedCustomer.risk === 'Medium' ? 'text-amber-400' : 'text-rose-400'}`}>{selectedCustomer.risk}</span>
                      </div>
                      <div className="flex justify-between border-b border-gray-800 pb-3">
                        <span className="text-gray-400">Last Active</span>
                        <span className="text-white">{selectedCustomer.date}</span>
                      </div>
                      <div className="flex justify-between border-b border-gray-800 pb-3">
                        <span className="text-gray-400">Total Transactions</span>
                        <span className="text-white">42</span>
                      </div>
                      <div className="flex justify-between pb-3">
                        <span className="text-gray-400">Account Status</span>
                        <span className="text-emerald-400">Active</span>
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => { setSelectedCustomer(null); setCurrentView('Graph Explorer'); }}
                      className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl font-bold transition-all flex justify-center items-center gap-2">
                      <Network className="w-4 h-4" /> Expand in Graph Explorer
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {currentView === 'Policies' && (
            <div className="absolute inset-8 flex flex-col animate-in fade-in duration-300">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-3"><ShieldAlert className="text-indigo-400" /> Active Fraud Policies</h2>
                <button className="bg-indigo-600 hover:bg-indigo-700 px-5 py-2.5 rounded-xl text-white font-semibold shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4" /> Deploy New Policy
                </button>
              </div>
              <div className="grid grid-cols-2 gap-6">
                {[
                  { title: 'Velocity Check: Rapid Transfers', desc: 'Blocks >3 outgoing transfers within 10 minutes to new payees.', active: true, tag: 'High Severity' },
                  { title: 'New Device Login', desc: 'Triggers step-up authentication (SMS) for unrecognized devices.', active: true, tag: 'Standard' },
                  { title: 'Impossible Travel', desc: 'Flags logins from disparate geographic locations within impossible timeframes.', active: true, tag: 'High Severity' },
                  { title: 'Synthetic Identity Patterns', desc: 'Detects SSNs shared across multiple accounts in graph clusters.', active: false, tag: 'Experimental' },
                ].map((p, i) => (
                  <div key={i} className={`glass-panel p-6 rounded-2xl border transition-all ${p.active ? 'border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.05)]' : 'border-gray-800/50 opacity-60'}`}>
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-white mb-2">{p.title}</h3>
                        <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-md border border-indigo-500/20">{p.tag}</span>
                      </div>
                      <div className={`w-14 h-7 rounded-full p-1 cursor-pointer transition-colors ${p.active ? 'bg-indigo-600' : 'bg-gray-700'}`}>
                        <div className={`w-5 h-5 rounded-full bg-white transition-transform ${p.active ? 'translate-x-7 shadow-md' : 'translate-x-0'}`}></div>
                      </div>
                    </div>
                    <p className="text-gray-400 text-sm leading-relaxed mt-2">{p.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {currentView === 'Settings' && (
            <div className="absolute inset-8 flex flex-col animate-in fade-in duration-300 max-w-4xl mx-auto w-full pt-4">
              <h2 className="text-2xl font-bold text-white mb-8 flex items-center gap-3"><Settings className="text-indigo-400" /> System Configuration</h2>
              
              <div className="glass-panel p-8 rounded-2xl border border-gray-800/50 mb-8 shadow-xl">
                <h3 className="text-lg font-bold text-white mb-6 border-b border-gray-700/50 pb-3 flex items-center gap-2"><Network className="w-5 h-5 text-indigo-400" /> Infrastructure Integrations</h3>
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-400 mb-2">TigerGraph Connection URI</label>
                    <input type="text" value="https://fraud-cluster.tigergraph.com:9000" readOnly className="w-full bg-gray-900/80 border border-gray-700 rounded-xl px-4 py-3 text-gray-300 font-mono text-sm focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-400 mb-2">LLM Engine (GraphRAG)</label>
                    <select className="w-full bg-gray-900/80 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors">
                      <option>Google Gemini (gemini-1.5-flash-latest)</option>
                      <option>Groq (llama-3.1-70b-versatile)</option>
                      <option>OpenAI (gpt-4o)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="glass-panel p-8 rounded-2xl border border-gray-800/50 shadow-xl">
                <h3 className="text-lg font-bold text-white mb-6 border-b border-gray-700/50 pb-3 flex items-center gap-2"><ShieldAlert className="w-5 h-5 text-indigo-400" /> Agent Autonomy Thresholds</h3>
                <div className="space-y-8">
                  <div>
                    <div className="flex justify-between text-sm mb-3">
                      <span className="text-gray-300 font-semibold">Auto-Block Confidence Threshold</span>
                      <span className="text-indigo-400 font-bold text-lg">85%</span>
                    </div>
                    <div className="w-full bg-gray-800 rounded-full h-3">
                      <div className="bg-indigo-500 h-3 rounded-full relative shadow-[0_0_10px_rgba(99,102,241,0.6)]" style={{ width: '85%' }}>
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-md"></div>
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 mt-3 font-medium">Agent will automatically execute blocks if confidence exceeds this value.</p>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-3">
                      <span className="text-gray-300 font-semibold">Human-in-the-Loop Threshold</span>
                      <span className="text-amber-400 font-bold text-lg">50% - 84%</span>
                    </div>
                    <div className="w-full bg-gray-800 rounded-full h-3 flex overflow-hidden">
                      <div className="bg-gray-800 h-3" style={{ width: '50%' }}></div>
                      <div className="bg-amber-500 h-3 shadow-[0_0_10px_rgba(245,158,11,0.6)]" style={{ width: '35%' }}></div>
                      <div className="bg-gray-800 h-3" style={{ width: '15%' }}></div>
                    </div>
                    <p className="text-sm text-gray-500 mt-3 font-medium">Transactions in this range require explicit human analyst approval.</p>
                  </div>
                  <button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-lg py-4 rounded-xl mt-6 shadow-lg shadow-indigo-500/20 transition-all active:scale-[0.99]">
                    Save Configuration
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;










