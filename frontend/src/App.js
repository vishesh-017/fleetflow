import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

axios.defaults.baseURL = 'http://127.0.0.1:5000';

// ─── jsPDF loader ─────────────────────────────────────────────────────────────
const loadJsPDF = () => new Promise((resolve) => {
  if (window.jspdf) return resolve(window.jspdf.jsPDF);
  const script = document.createElement('script');
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
  script.onload = () => resolve(window.jspdf.jsPDF);
  document.head.appendChild(script);
});

// ─── RBAC ─────────────────────────────────────────────────────────────────────
const PERMISSIONS = {
  addVehicle:     ['manager'],
  retireVehicle:  ['manager'],
  addDriver:      ['manager'],
  suspendDriver:  ['manager', 'safety_officer'],
  createTrip:     ['manager', 'dispatcher'],
  dispatchTrip:   ['manager', 'dispatcher'],
  completeTrip:   ['manager', 'dispatcher'],
  cancelTrip:     ['manager', 'dispatcher'],
  logMaintenance: ['manager'],
  resolveMaint:   ['manager'],
  logFuel:        ['manager', 'analyst'],
};
const can = (role, action) => PERMISSIONS[action]?.includes(role) ?? false;

// ─── NAV ──────────────────────────────────────────────────────────────────────
const NAV = [
  { section: 'Overview' },
  { id: 'dashboard',   label: 'Command Center',   icon: '◈' },
  { section: 'Operations' },
  { id: 'vehicles',    label: 'Vehicle Registry', icon: '⬡' },
  { id: 'drivers',     label: 'Driver Profiles',  icon: '◎' },
  { id: 'trips',       label: 'Trip Dispatcher',  icon: '→' },
  { section: 'Finance' },
  { id: 'maintenance', label: 'Maintenance',       icon: '⚙' },
  { id: 'fuel',        label: 'Fuel & Expenses',  icon: '◆' },
  { section: 'Insights' },
  { id: 'analytics',  label: 'Analytics',         icon: '▲' },
];

// ─── CSS ──────────────────────────────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
  :root{--bg:#0a0c10;--surface:#111318;--border:#1e2128;--muted:#2a2e38;--text:#e8eaf0;--sub:#6b7280;--accent:#f97316;--accent2:#3b82f6;--green:#22c55e;--red:#ef4444;--yellow:#eab308;--purple:#a855f7;}
  body{background:var(--bg);color:var(--text);font-family:'DM Sans',sans-serif;font-size:14px;}
  .app{display:flex;min-height:100vh;}
  .sidebar{width:220px;min-height:100vh;background:var(--surface);border-right:1px solid var(--border);display:flex;flex-direction:column;padding:24px 0;position:fixed;top:0;left:0;bottom:0;z-index:100;overflow-y:auto;}
  .sidebar-logo{padding:0 20px 28px;font-family:'Syne',sans-serif;font-size:20px;font-weight:800;color:var(--accent);}
  .sidebar-logo span{color:var(--text);}
  .nav-item{display:flex;align-items:center;gap:10px;padding:10px 20px;cursor:pointer;color:var(--sub);font-size:13px;font-weight:500;transition:all 0.15s;border-left:2px solid transparent;}
  .nav-item:hover{color:var(--text);background:var(--muted);}
  .nav-item.active{color:var(--accent);border-left-color:var(--accent);background:rgba(249,115,22,0.07);}
  .nav-section{padding:16px 20px 6px;font-size:10px;letter-spacing:1px;color:var(--muted);text-transform:uppercase;}
  .login-wrap{min-height:100vh;display:flex;align-items:center;justify-content:center;background:var(--bg);}
  .login-box{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:48px;width:400px;}
  .login-title{font-family:'Syne',sans-serif;font-size:28px;font-weight:800;margin-bottom:4px;}
  .login-sub{color:var(--sub);margin-bottom:32px;font-size:13px;}
  .forgot-link{font-size:12px;color:var(--accent2);cursor:pointer;text-align:right;margin-top:-8px;margin-bottom:16px;}
  .forgot-link:hover{text-decoration:underline;}
  .quick-fill-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:16px;}
  .quick-fill-btn{padding:8px;background:var(--muted);border:1px solid var(--border);border-radius:6px;color:var(--sub);font-size:11px;cursor:pointer;text-align:center;font-family:'DM Sans',sans-serif;transition:all 0.15s;}
  .quick-fill-btn:hover{color:var(--text);border-color:var(--sub);}
  .field{margin-bottom:16px;}
  .field label{display:block;font-size:12px;color:var(--sub);margin-bottom:6px;font-weight:500;}
  .field input,.field select,.field textarea{width:100%;padding:9px 12px;background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text);font-family:'DM Sans',sans-serif;font-size:13px;outline:none;transition:border-color 0.15s;}
  .field input:focus,.field select:focus,.field textarea:focus{border-color:var(--accent);}
  .field textarea{resize:vertical;min-height:80px;}
  .field select option{background:var(--bg);}
  .form-row{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
  .btn{padding:8px 16px;border-radius:6px;border:none;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:500;transition:all 0.15s;display:inline-flex;align-items:center;gap:6px;}
  .btn-primary{background:var(--accent);color:#fff;}.btn-primary:hover{background:#ea6c0a;}
  .btn-secondary{background:var(--muted);color:var(--text);}.btn-secondary:hover{background:#333844;}
  .btn-ghost{background:transparent;color:var(--sub);border:1px solid var(--border);}.btn-ghost:hover{color:var(--text);border-color:var(--sub);}
  .btn-danger{background:rgba(239,68,68,0.15);color:var(--red);border:1px solid rgba(239,68,68,0.3);}.btn-danger:hover{background:rgba(239,68,68,0.25);}
  .btn-success{background:rgba(34,197,94,0.15);color:var(--green);border:1px solid rgba(34,197,94,0.3);}.btn-success:hover{background:rgba(34,197,94,0.25);}
  .btn-sm{padding:5px 10px;font-size:12px;}.btn-full{width:100%;justify-content:center;}
  .btn:disabled{opacity:0.5;cursor:not-allowed;}
  .page-header{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:28px;}
  .page-title{font-family:'Syne',sans-serif;font-size:22px;font-weight:800;}
  .page-sub{color:var(--sub);font-size:13px;margin-top:2px;}
  .flex{display:flex;}.gap-2{gap:8px;}.gap-3{gap:12px;}.items-center{align-items:center;}
  .text-sub{color:var(--sub);}.text-sm{font-size:12px;}.mt-4{margin-top:16px;}.mb-4{margin-bottom:16px;}
  .empty{text-align:center;padding:48px;color:var(--sub);font-size:13px;}
  .kpi-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:16px;margin-bottom:28px;}
  .kpi-card{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:20px;position:relative;overflow:hidden;}
  .kpi-card::after{content:'';position:absolute;bottom:0;left:0;right:0;height:2px;background:var(--accent-clr,var(--accent));}
  .kpi-label{font-size:11px;color:var(--sub);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;}
  .kpi-value{font-family:'DM Mono',monospace;font-size:28px;font-weight:500;}
  .kpi-sub{font-size:11px;color:var(--sub);margin-top:4px;}
  .kpi-change{font-size:11px;margin-top:4px;font-weight:600;}
  .kpi-change.up{color:var(--green);}.kpi-change.down{color:var(--red);}
  .table-wrap{background:var(--surface);border:1px solid var(--border);border-radius:10px;overflow:hidden;}
  table{width:100%;border-collapse:collapse;}
  th{padding:10px 16px;font-size:11px;color:var(--sub);text-align:left;border-bottom:1px solid var(--border);font-weight:500;text-transform:uppercase;}
  td{padding:12px 16px;font-size:13px;border-bottom:1px solid var(--border);}
  tr:last-child td{border-bottom:none;}
  tr:hover td{background:rgba(255,255,255,0.02);}
  .mono{font-family:'DM Mono',monospace;font-size:12px;}
  .pill{display:inline-flex;align-items:center;gap:5px;padding:3px 9px;border-radius:20px;font-size:11px;font-weight:500;text-transform:uppercase;}
  .pill::before{content:'';width:5px;height:5px;border-radius:50%;background:currentColor;opacity:0.8;}
  .pill-green{background:rgba(34,197,94,0.12);color:var(--green);}
  .pill-red{background:rgba(239,68,68,0.12);color:var(--red);}
  .pill-yellow{background:rgba(234,179,8,0.12);color:var(--yellow);}
  .pill-blue{background:rgba(59,130,246,0.12);color:var(--accent2);}
  .pill-gray{background:var(--muted);color:var(--sub);}
  .panel{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:24px;}
  .panel-title{font-size:14px;font-weight:600;margin-bottom:16px;}
  .alert{padding:10px 14px;border-radius:6px;font-size:13px;margin-bottom:16px;}
  .alert-err{background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);color:var(--red);}
  .alert-ok{background:rgba(34,197,94,0.1);border:1px solid rgba(34,197,94,0.3);color:var(--green);}
  .alert-warn{background:rgba(234,179,8,0.08);border:1px solid rgba(234,179,8,0.3);color:var(--yellow);}
  .alert-info{background:rgba(59,130,246,0.08);border:1px solid rgba(59,130,246,0.3);color:#93c5fd;}
  .modal-bg{position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:200;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(2px);}
  .modal{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:32px;width:500px;max-height:90vh;overflow-y:auto;}
  .modal-title{font-family:'Syne',sans-serif;font-size:18px;font-weight:800;margin-bottom:20px;}
  .modal-footer{display:flex;gap:10px;justify-content:flex-end;margin-top:20px;}
  .tabs{display:flex;gap:2px;margin-bottom:20px;background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:4px;width:fit-content;flex-wrap:wrap;}
  .tab{padding:6px 16px;border-radius:5px;cursor:pointer;font-size:12px;font-weight:500;color:var(--sub);transition:all 0.15s;}
  .tab.active{background:var(--accent);color:#fff;}
  .progress-bar{height:4px;background:var(--muted);border-radius:2px;overflow:hidden;margin-top:8px;}
  .progress-fill{height:100%;background:var(--accent);border-radius:2px;transition:width 0.3s;}
  .score-bar{display:flex;align-items:center;gap:8px;}
  .score-track{flex:1;height:4px;background:var(--muted);border-radius:2px;overflow:hidden;}
  .score-fill{height:100%;border-radius:2px;}
  .roi-positive{color:var(--green);}.roi-negative{color:var(--red);}
  .sidebar-bottom{margin-top:auto;padding:16px 20px;border-top:1px solid var(--border);}
  .sidebar-user{font-size:12px;color:var(--sub);margin-bottom:2px;word-break:break-all;}
  .sidebar-role{font-size:11px;color:var(--accent);font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px;}
  .role-notice{background:rgba(59,130,246,0.07);border:1px solid rgba(59,130,246,0.2);border-radius:6px;padding:8px 12px;font-size:11px;color:#93c5fd;margin-bottom:16px;}
  .filter-bar{display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap;align-items:center;}
  .filter-select{padding:7px 12px;background:var(--surface);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:12px;outline:none;cursor:pointer;font-family:'DM Sans',sans-serif;}
  .filter-select option{background:var(--bg);}
  .topbar{position:fixed;top:0;left:220px;right:0;height:56px;background:rgba(10,12,16,0.95);border-bottom:1px solid var(--border);display:flex;align-items:center;padding:0 32px;gap:16px;z-index:50;backdrop-filter:blur(8px);}
  .search-wrap{flex:1;max-width:440px;position:relative;}
  .search-input{width:100%;padding:8px 12px 8px 36px;background:var(--surface);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:13px;font-family:'DM Sans',sans-serif;outline:none;transition:border-color 0.15s;}
  .search-input:focus{border-color:var(--accent2);}
  .search-icon{position:absolute;left:10px;top:50%;transform:translateY(-50%);color:var(--sub);font-size:14px;}
  .search-results{position:absolute;top:calc(100%+6px);left:0;right:0;background:var(--surface);border:1px solid var(--border);border-radius:10px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.5);z-index:200;}
  .search-result-item{padding:10px 14px;cursor:pointer;display:flex;align-items:center;gap:10px;font-size:13px;border-bottom:1px solid var(--border);}
  .search-result-item:last-child{border-bottom:none;}
  .search-result-item:hover{background:var(--muted);}
  .search-result-type{font-size:10px;color:var(--sub);text-transform:uppercase;letter-spacing:0.5px;width:60px;flex-shrink:0;}
  .main-with-topbar{margin-left:220px;flex:1;padding:32px;min-height:100vh;padding-top:88px;}
  .avatar{width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--purple));display:flex;align-items:center;justify-content:center;font-family:'Syne',sans-serif;font-size:18px;font-weight:800;color:#fff;flex-shrink:0;margin-bottom:12px;}
  .avatar-sm{width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--purple));display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#fff;flex-shrink:0;}
  .auth-toggle{display:flex;gap:4px;background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:4px;margin-bottom:24px;}
  .auth-toggle-btn{flex:1;padding:7px;border-radius:5px;border:none;cursor:pointer;font-size:13px;font-weight:500;font-family:'DM Sans',sans-serif;color:var(--sub);background:transparent;transition:all 0.15s;}
  .auth-toggle-btn.active{background:var(--accent);color:#fff;}
  .dead-stock-card{background:rgba(234,179,8,0.06);border:1px solid rgba(234,179,8,0.25);border-radius:10px;padding:16px;margin-bottom:16px;}
  .dead-stock-title{font-size:12px;color:var(--yellow);font-weight:600;letter-spacing:0.5px;text-transform:uppercase;margin-bottom:10px;}
  .dead-stock-row{display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(234,179,8,0.1);font-size:12px;}
  .dead-stock-row:last-child{border-bottom:none;}
  .chart-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:24px;}
  .chart-panel{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:20px;}
  .chart-title{font-size:13px;font-weight:600;margin-bottom:16px;color:var(--text);}
  .fin-table td,.fin-table th{padding:10px 14px;}
  .quick-actions{display:flex;gap:10px;margin-bottom:24px;}
`;

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const apiSet = (token) => { axios.defaults.headers.common['Authorization'] = `Bearer ${token}`; };
const statusPill = (s) => {
  const map = { available:'pill-green',on_trip:'pill-blue',in_shop:'pill-yellow',retired:'pill-gray',off_duty:'pill-gray',on_duty:'pill-green',suspended:'pill-red',draft:'pill-gray',dispatched:'pill-blue',completed:'pill-green',cancelled:'pill-red',new:'pill-yellow',resolved:'pill-green' };
  return <span className={`pill ${map[s]||'pill-gray'}`}>{s?.replace(/_/g,' ')}</span>;
};
const fmt = (n, d=0) => n==null?'—':Number(n).toFixed(d);
const scoreColor = (s) => s>=80?'var(--green)':s>=50?'var(--yellow)':'var(--red)';
const isExpired = (dt) => dt && new Date(dt) < new Date();
const expiresSoon = (dt) => dt && !isExpired(dt) && new Date(dt) < new Date(Date.now()+30*86400000);
const initials = (email) => email ? email.substring(0,2).toUpperCase() : 'FF';

// ─── GLOBAL SEARCH ───────────────────────────────────────────────────────────
function GlobalSearch({ onNavigate }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const search = async (val) => {
    setQ(val);
    if (!val.trim()) { setResults([]); setOpen(false); return; }
    try {
      const [v, d, t] = await Promise.all([
        axios.get('/vehicles').catch(() => ({ data: [] })),
        axios.get('/drivers').catch(() => ({ data: [] })),
        axios.get('/trips').catch(() => ({ data: [] })),
      ]);
      const lower = val.toLowerCase();
      const res = [
        ...v.data.filter(x=>(x.plate||'').toLowerCase().includes(lower)||(x.name||'').toLowerCase().includes(lower)).slice(0,3).map(x=>({type:'Vehicle',label:`${x.name||x.plate} — ${x.status}`,page:'vehicles'})),
        ...d.data.filter(x=>(x.name||'').toLowerCase().includes(lower)).slice(0,3).map(x=>({type:'Driver',label:`${x.name} — ${x.status}`,page:'drivers'})),
        ...t.data.filter(x=>(x.origin||'').toLowerCase().includes(lower)||(x.destination||'').toLowerCase().includes(lower)).slice(0,3).map(x=>({type:'Trip',label:`#${x.id} ${x.origin}→${x.destination}`,page:'trips'})),
      ];
      setResults(res); setOpen(res.length>0);
    } catch {}
  };

  return (
    <div className="search-wrap" ref={ref}>
      <span className="search-icon">⌕</span>
      <input className="search-input" placeholder="Search vehicles, drivers, trips…" value={q}
        onChange={e=>search(e.target.value)} onFocus={()=>q&&setOpen(true)}/>
      {open && (
        <div className="search-results">
          {results.map((r,i)=>(
            <div key={i} className="search-result-item" onClick={()=>{onNavigate(r.page);setQ('');setOpen(false);}}>
              <span className="search-result-type">{r.type}</span>
              <span>{r.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── FORGOT PASSWORD ──────────────────────────────────────────────────────────
function ForgotPassword({ onClose }) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const isValidEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());

  const send = async () => {
    setErr('');
    if (!email.trim()) return setErr('Please enter your email address.');
    if (!isValidEmail(email)) return setErr('Invalid email format.');
    setLoading(true);
    try {
      const res = await axios.post('/check-email', { email: email.trim() });
      if (!res.data.exists) { setErr('No account found with this email.'); setLoading(false); return; }
      await new Promise(r => setTimeout(r, 800));
      setSent(true);
    } catch { setErr('Could not connect to server.'); }
    setLoading(false);
  };

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" style={{width:380}} onClick={e=>e.stopPropagation()}>
        <div className="modal-title">Reset Password</div>
        {sent ? (
          <>
            <div className="alert alert-ok">✓ Reset link sent to <strong>{email}</strong></div>
            <div className="alert alert-info" style={{fontSize:12}}>(Demo) Use password <strong>123</strong> for any account.</div>
            <div className="modal-footer"><button className="btn btn-primary" onClick={onClose}>Back to Login</button></div>
          </>
        ) : (
          <>
            <p style={{fontSize:13,color:'var(--sub)',marginBottom:20}}>Enter your account email and we'll send a reset link.</p>
            {err && <div className="alert alert-err">{err}</div>}
            <div className="field">
              <label>Email Address</label>
              <input type="email" value={email} onChange={e=>{setEmail(e.target.value);setErr('');}} placeholder="your@email.com" onKeyDown={e=>e.key==='Enter'&&send()}/>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
              <button className="btn btn-primary" onClick={send} disabled={loading||!email.trim()}>{loading?'Checking…':'Send Reset Link'}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── LOGIN / REGISTER ────────────────────────────────────────────────────────
function Login({ onLogin }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('manager@test.com');
  const [pass, setPass] = useState('123');
  const [name, setName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPass, setRegPass] = useState('');
  const [regPass2, setRegPass2] = useState('');
  const [regRole, setRegRole] = useState('dispatcher');
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [showForgot, setShowForgot] = useState(false);

  const submit = async (e) => {
    e.preventDefault(); setErr(''); setOk('');
    try {
      const res = await axios.post('/login', { email, password: pass });
      onLogin(res.data.token, res.data.role, email);
    } catch { setErr('Invalid credentials. Try a quick-fill below.'); }
  };

  const register = async (e) => {
    e.preventDefault(); setErr(''); setOk('');
    if (!name.trim()) return setErr('Full name is required.');
    if (!regEmail.trim()) return setErr('Email is required.');
    if (regPass.length < 3) return setErr('Password must be at least 3 characters.');
    if (regPass !== regPass2) return setErr('Passwords do not match.');
    try {
      await axios.post('/register', { name, email: regEmail, password: regPass, role: regRole });
      setOk('Account created! You can now sign in.');
      setMode('login'); setEmail(regEmail); setPass(regPass);
    } catch(e) { setErr(e.response?.data?.error || 'Registration failed.'); }
  };

  return (
    <div className="login-wrap">
      {showForgot && <ForgotPassword onClose={()=>setShowForgot(false)}/>}
      <div className="login-box">
        <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:20}}>
          <div className="avatar">{mode==='login'?'FF':'+'}</div>
          <div>
            <div className="login-title">Fleet<span style={{color:'var(--accent)'}}>Flow</span></div>
            <div className="login-sub">Fleet & Logistics Management System</div>
          </div>
        </div>
        <div className="auth-toggle">
          <button className={`auth-toggle-btn ${mode==='login'?'active':''}`} onClick={()=>{setMode('login');setErr('');setOk('');}}>Sign In</button>
          <button className={`auth-toggle-btn ${mode==='register'?'active':''}`} onClick={()=>{setMode('register');setErr('');setOk('');}}>Register</button>
        </div>
        {err && <div className="alert alert-err">{err}</div>}
        {ok  && <div className="alert alert-ok">{ok}</div>}
        {mode==='login' ? (
          <form onSubmit={submit}>
            <div className="field"><label>Email</label><input value={email} onChange={e=>setEmail(e.target.value)}/></div>
            <div className="field"><label>Password</label><input type="password" value={pass} onChange={e=>setPass(e.target.value)}/></div>
            <div className="forgot-link" onClick={()=>setShowForgot(true)}>Forgot Password?</div>
            <button className="btn btn-primary btn-full" type="submit">Sign In</button>
            <div style={{marginTop:20,fontSize:11,color:'var(--sub)',textAlign:'center',marginBottom:8}}>DEMO QUICK FILL</div>
            <div className="quick-fill-grid">
              {[['manager@test.com','Manager'],['dispatcher@test.com','Dispatcher'],['safety@test.com','Safety Officer'],['analyst@test.com','Analyst']].map(([em,label])=>(
                <button key={em} type="button" className="quick-fill-btn" onClick={()=>{setEmail(em);setPass('123');}}>{label}</button>
              ))}
            </div>
          </form>
        ) : (
          <form onSubmit={register}>
            <div className="field"><label>Full Name *</label><input value={name} onChange={e=>setName(e.target.value)} placeholder="Arjun Sharma"/></div>
            <div className="field"><label>Email *</label><input type="email" value={regEmail} onChange={e=>setRegEmail(e.target.value)} placeholder="you@company.com"/></div>
            <div className="field"><label>Role</label>
              <select value={regRole} onChange={e=>setRegRole(e.target.value)}>
                <option value="manager">Manager</option>
                <option value="dispatcher">Dispatcher</option>
                <option value="safety_officer">Safety Officer</option>
                <option value="analyst">Analyst</option>
              </select>
            </div>
            <div className="form-row">
              <div className="field"><label>Password *</label><input type="password" value={regPass} onChange={e=>setRegPass(e.target.value)} placeholder="min 3 chars"/></div>
              <div className="field"><label>Confirm Password *</label><input type="password" value={regPass2} onChange={e=>setRegPass2(e.target.value)}/></div>
            </div>
            <button className="btn btn-primary btn-full" type="submit">Create Account</button>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({ role, onNavigate }) {
  const [data, setData] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [trips, setTrips] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [filters, setFilters] = useState({type:'',status:'',region:''});
  const [sortBy, setSortBy] = useState('');
  const [groupBy, setGroupBy] = useState('');

  useEffect(()=>{
    axios.get('/dashboard').then(r=>setData(r.data)).catch(()=>{});
    axios.get('/vehicles').then(r=>setVehicles(r.data)).catch(()=>{});
    axios.get('/trips').then(r=>setTrips(r.data)).catch(()=>{});
    axios.get('/drivers').then(r=>setDrivers(r.data)).catch(()=>{});
  },[]);

  if (!data) return <div className="empty">Loading…</div>;

  const kpis = [
    {label:'Active Fleet',   value:data.active_fleet,          sub:'on trip now',    color:'var(--accent2)', change:'+2',dir:'up'},
    {label:'In Maintenance', value:data.in_shop,               sub:'in shop',        color:'var(--yellow)',  change:'—',dir:''},
    {label:'Idle Vehicles',  value:data.idle,                  sub:'available',      color:'var(--green)',   change:'-1',dir:'down'},
    {label:'Utilization',    value:`${data.utilization_rate}%`,sub:'fleet assigned', color:'var(--accent)',  change:'+12.5%',dir:'up'},
    {label:'Pending Cargo',  value:data.pending_cargo,         sub:'draft trips',    color:'var(--red)',     change:'—',dir:''},
  ];

  const regions = [...new Set(vehicles.map(v=>v.region).filter(Boolean))];
  let filtered = [...vehicles];
  if (filters.type)   filtered = filtered.filter(v=>v.vehicle_type===filters.type);
  if (filters.status) filtered = filtered.filter(v=>v.status===filters.status);
  if (filters.region) filtered = filtered.filter(v=>v.region===filters.region);
  if (sortBy==='capacity') filtered.sort((a,b)=>b.capacity-a.capacity);
  if (sortBy==='odometer') filtered.sort((a,b)=>b.odometer-a.odometer);
  if (sortBy==='plate')    filtered.sort((a,b)=>(a.plate||'').localeCompare(b.plate));
  const hasFilter = filters.type||filters.status||filters.region;

  let grouped = {};
  if (groupBy==='region') {
    filtered.forEach(v=>{ const g=v.region||'Unknown'; grouped[g]=(grouped[g]||[]); grouped[g].push(v); });
  }

  const recentTrips = [...trips].reverse().slice(0,6);
  const driverMap = Object.fromEntries(drivers.map(d=>[d.id, d.name]));
  const vehiclesWithTrips = new Set(trips.map(t=>t.vehicle_id));
  const deadStock = vehicles.filter(v=>v.status==='available'&&!vehiclesWithTrips.has(v.id));

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">Command Center</div><div className="page-sub">Live fleet overview · {role}</div></div>
      </div>

      {(can(role,'createTrip')||can(role,'addVehicle')) && (
        <div className="quick-actions">
          {can(role,'createTrip') && <button className="btn btn-primary" onClick={()=>onNavigate('trips')}>+ New Trip</button>}
          {can(role,'addVehicle') && <button className="btn btn-secondary" onClick={()=>onNavigate('vehicles')}>+ New Vehicle</button>}
          {can(role,'addDriver')  && <button className="btn btn-secondary" onClick={()=>onNavigate('drivers')}>+ New Driver</button>}
        </div>
      )}

      <div className="kpi-grid">
        {kpis.map(k=>(
          <div className="kpi-card" key={k.label} style={{'--accent-clr':k.color}}>
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value" style={{color:k.color}}>{k.value}</div>
            <div className="kpi-sub">{k.sub}</div>
            {k.dir && <div className={`kpi-change ${k.dir}`}>{k.dir==='up'?'↑':'↓'} {k.change} vs last month</div>}
          </div>
        ))}
      </div>

      {deadStock.length > 0 && (
        <div className="dead-stock-card">
          <div className="dead-stock-title">⚠ Dead Stock Alert — {deadStock.length} idle vehicle{deadStock.length>1?'s':''} with no trips</div>
          {deadStock.map(v=>(
            <div className="dead-stock-row" key={v.id}>
              <span className="mono">{v.plate}</span>
              <span style={{color:'var(--sub)'}}>{v.name||v.vehicle_type}</span>
              <span style={{color:'var(--sub)'}}>{v.region||'No region'}</span>
              {statusPill(v.status)}
            </div>
          ))}
        </div>
      )}

      <div className="panel" style={{marginBottom:20}}>
        <div className="panel-title">Fleet Utilization</div>
        <div style={{fontSize:13,color:'var(--sub)',marginBottom:8}}>{data.active_fleet} of {data.total} vehicles on trip</div>
        <div className="progress-bar"><div className="progress-fill" style={{width:`${data.utilization_rate}%`}}/></div>
      </div>

      <div className="panel" style={{marginBottom:20}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
          <div className="panel-title" style={{marginBottom:0}}>Recent Trips</div>
          <button className="btn btn-ghost btn-sm" onClick={()=>onNavigate('trips')}>View All →</button>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Trip</th><th>Route</th><th>Vehicle</th><th>Driver</th><th>Cargo</th><th>Revenue</th><th>Status</th></tr></thead>
            <tbody>
              {recentTrips.length===0 && <tr><td colSpan={7}><div className="empty">No trips yet.</div></td></tr>}
              {recentTrips.map(t=>(
                <tr key={t.id}>
                  <td className="mono">#{t.id}</td>
                  <td>{t.origin||'—'} → {t.destination||'—'}</td>
                  <td className="mono">{t.vehicle_id}</td>
                  <td>{driverMap[t.driver_id]||`#${t.driver_id}`}</td>
                  <td className="mono">{t.cargo_weight} kg</td>
                  <td className="mono">{t.revenue?`₹${fmt(t.revenue,0)}`:'—'}</td>
                  <td>{statusPill(t.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel">
        <div className="panel-title">Fleet Filter</div>
        <div className="filter-bar">
          <select className="filter-select" value={filters.type} onChange={e=>setFilters({...filters,type:e.target.value})}>
            <option value="">All Types</option><option>Truck</option><option>Van</option><option>Bike</option>
          </select>
          <select className="filter-select" value={filters.status} onChange={e=>setFilters({...filters,status:e.target.value})}>
            <option value="">All Statuses</option>
            <option value="available">Available</option><option value="on_trip">On Trip</option>
            <option value="in_shop">In Shop</option><option value="retired">Retired</option>
          </select>
          <select className="filter-select" value={filters.region} onChange={e=>setFilters({...filters,region:e.target.value})}>
            <option value="">All Regions</option>
            {regions.map(r=><option key={r}>{r}</option>)}
          </select>
          <select className="filter-select" value={sortBy} onChange={e=>setSortBy(e.target.value)}>
            <option value="">Sort By…</option>
            <option value="capacity">Capacity ↓</option>
            <option value="odometer">Odometer ↓</option>
            <option value="plate">Plate A–Z</option>
          </select>
          <select className="filter-select" value={groupBy} onChange={e=>setGroupBy(e.target.value)}>
            <option value="">Group By…</option>
            <option value="region">Region</option>
          </select>
          {(hasFilter||sortBy||groupBy) && <button className="btn btn-ghost btn-sm" onClick={()=>{setFilters({type:'',status:'',region:''});setSortBy('');setGroupBy('');}}>Clear</button>}
        </div>
        {(hasFilter||sortBy||groupBy) && (
          <div className="table-wrap" style={{marginTop:12}}>
            {groupBy==='region' ? (
              Object.entries(grouped).map(([grp,vlist])=>(
                <div key={grp}>
                  <div style={{padding:'8px 16px',background:'var(--muted)',fontSize:11,color:'var(--sub)',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.5px'}}>{grp} ({vlist.length})</div>
                  <table><tbody>
                    {vlist.map(v=>(
                      <tr key={v.id}>
                        <td>{v.name||'—'}</td><td className="mono">{v.plate}</td>
                        <td>{v.vehicle_type}</td><td className="mono">{v.capacity} kg</td>
                        <td>{statusPill(v.status)}</td>
                      </tr>
                    ))}
                  </tbody></table>
                </div>
              ))
            ) : (
              <table>
                <thead><tr><th>Name</th><th>Plate</th><th>Type</th><th>Capacity</th><th>Region</th><th>Status</th></tr></thead>
                <tbody>
                  {filtered.length===0 && <tr><td colSpan={6}><div className="empty">No vehicles match.</div></td></tr>}
                  {filtered.map(v=>(
                    <tr key={v.id}>
                      <td>{v.name||'—'}</td><td className="mono">{v.plate}</td>
                      <td>{v.vehicle_type}</td><td className="mono">{v.capacity} kg</td>
                      <td>{v.region||'—'}</td><td>{statusPill(v.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── VEHICLES ─────────────────────────────────────────────────────────────────
function Vehicles({ role }) {
  const [list,setList]=useState([]); const [showForm,setShowForm]=useState(false);
  const [err,setErr]=useState(''); const [ok,setOk]=useState('');
  const [form,setForm]=useState({name:'',model:'',plate:'',vehicle_type:'Van',capacity:'',odometer:'',region:'',acquisition_cost:''});
  const load=()=>axios.get('/vehicles').then(r=>setList(r.data));
  useEffect(()=>{load();},[]);
  const submit=async()=>{
    setErr('');setOk('');
    if(!form.plate||!form.capacity)return setErr('Plate and capacity are required.');
    try{
      await axios.post('/vehicles',{...form,capacity:parseFloat(form.capacity),odometer:parseFloat(form.odometer||0),acquisition_cost:parseFloat(form.acquisition_cost||0)});
      setOk('Vehicle added!');setShowForm(false);
      setForm({name:'',model:'',plate:'',vehicle_type:'Van',capacity:'',odometer:'',region:'',acquisition_cost:''});load();
    }catch(e){setErr(e.response?.data?.error||'Error adding vehicle.');}
  };
  const retire=async(id)=>{if(!window.confirm('Retire this vehicle?'))return;await axios.put(`/vehicles/${id}`,{status:'retired'});load();};
  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">Vehicle Registry</div><div className="page-sub">Asset management & lifecycle</div></div>
        {can(role,'addVehicle')&&<button className="btn btn-primary" onClick={()=>{setErr('');setOk('');setShowForm(true);}}>+ Add Vehicle</button>}
      </div>
      {!can(role,'addVehicle')&&<div className="role-notice">👁 Read-only: Only Managers can add or retire vehicles.</div>}
      {err&&<div className="alert alert-err">{err}</div>}
      {ok&&<div className="alert alert-ok">{ok}</div>}
      <div className="table-wrap">
        <table>
          <thead><tr><th>Name / Model</th><th>Plate</th><th>Type</th><th>Capacity</th><th>Odometer</th><th>Region</th><th>Status</th>{can(role,'retireVehicle')&&<th>Actions</th>}</tr></thead>
          <tbody>
            {list.length===0&&<tr><td colSpan={8}><div className="empty">No vehicles registered.</div></td></tr>}
            {list.map(v=>(
              <tr key={v.id}>
                <td><div>{v.name||'—'}</div><div className="text-sub text-sm">{v.model}</div></td>
                <td><span className="mono">{v.plate}</span></td>
                <td>{v.vehicle_type}</td><td className="mono">{v.capacity} kg</td>
                <td className="mono">{fmt(v.odometer)} km</td>
                <td>{v.region||'—'}</td><td>{statusPill(v.status)}</td>
                {can(role,'retireVehicle')&&<td>{v.status!=='retired'&&<button className="btn btn-danger btn-sm" onClick={()=>retire(v.id)}>Retire</button>}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showForm&&can(role,'addVehicle')&&(
        <div className="modal-bg" onClick={()=>setShowForm(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div className="modal-title">Add Vehicle</div>
            {err&&<div className="alert alert-err">{err}</div>}
            <div className="form-row">
              <div className="field"><label>Name</label><input placeholder="Van-05" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></div>
              <div className="field"><label>Model</label><input placeholder="Toyota HiAce" value={form.model} onChange={e=>setForm({...form,model:e.target.value})}/></div>
            </div>
            <div className="form-row">
              <div className="field"><label>Plate *</label><input value={form.plate} onChange={e=>setForm({...form,plate:e.target.value})}/></div>
              <div className="field"><label>Type</label><select value={form.vehicle_type} onChange={e=>setForm({...form,vehicle_type:e.target.value})}><option>Truck</option><option>Van</option><option>Bike</option></select></div>
            </div>
            <div className="form-row">
              <div className="field"><label>Capacity (kg) *</label><input type="number" value={form.capacity} onChange={e=>setForm({...form,capacity:e.target.value})}/></div>
              <div className="field"><label>Odometer (km)</label><input type="number" value={form.odometer} onChange={e=>setForm({...form,odometer:e.target.value})}/></div>
            </div>
            <div className="form-row">
              <div className="field"><label>Region</label><input placeholder="Mumbai" value={form.region} onChange={e=>setForm({...form,region:e.target.value})}/></div>
              <div className="field"><label>Acquisition Cost (₹)</label><input type="number" value={form.acquisition_cost} onChange={e=>setForm({...form,acquisition_cost:e.target.value})}/></div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={()=>setShowForm(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={submit}>Add Vehicle</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── DRIVERS ──────────────────────────────────────────────────────────────────
function Drivers({ role }) {
  const [list,setList]=useState([]); const [showForm,setShowForm]=useState(false); const [err,setErr]=useState('');
  const [form,setForm]=useState({name:'',license_number:'',license_expiry:'',license_category:'Van'});
  const load=()=>axios.get('/drivers').then(r=>setList(r.data));
  useEffect(()=>{load();},[]);
  const submit=async()=>{setErr('');if(!form.name)return setErr('Driver name is required.');try{await axios.post('/drivers',form);setShowForm(false);setForm({name:'',license_number:'',license_expiry:'',license_category:'Van'});load();}catch(e){setErr(e.response?.data?.error||'Error.');}};
  const toggleStatus=async(d)=>{const next=d.status==='suspended'?'off_duty':d.status==='off_duty'?'on_duty':'suspended';await axios.put(`/drivers/${d.id}`,{status:next});load();};
  const expBanner  = list.filter(d=>isExpired(d.license_expiry));
  const soonBanner = list.filter(d=>expiresSoon(d.license_expiry));
  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">Driver Profiles</div><div className="page-sub">Performance & compliance management</div></div>
        {can(role,'addDriver')&&<button className="btn btn-primary" onClick={()=>{setErr('');setShowForm(true);}}>+ Add Driver</button>}
      </div>
      {role==='dispatcher'     &&<div className="role-notice">👁 Dispatcher view — read only.</div>}
      {role==='analyst'        &&<div className="role-notice">👁 Analyst view — read only.</div>}
      {role==='safety_officer' &&<div className="role-notice">🛡 Safety Officer — you can suspend or reinstate drivers.</div>}
      {expBanner.length>0  &&<div className="alert alert-err">🚫 Expired licenses: {expBanner.map(d=>d.name).join(', ')}</div>}
      {soonBanner.length>0 &&<div className="alert alert-warn">⚠ Licenses expiring within 30 days: {soonBanner.map(d=>d.name).join(', ')}</div>}
      <div className="table-wrap">
        <table>
          <thead><tr><th>Driver</th><th>License #</th><th>Expiry</th><th>Category</th><th>Safety Score</th><th>Completion</th><th>Complaints</th><th>Status</th>{can(role,'suspendDriver')&&<th>Actions</th>}</tr></thead>
          <tbody>
            {list.length===0&&<tr><td colSpan={9}><div className="empty">No drivers registered.</div></td></tr>}
            {list.map(d=>(
              <tr key={d.id}>
                <td><div style={{display:'flex',alignItems:'center',gap:8}}><div className="avatar-sm">{(d.name||'?').charAt(0)}</div>{d.name}</div></td>
                <td><span className="mono">{d.license_number||'—'}</span></td>
                <td>
                  <span style={{color:d.license_valid?'var(--green)':'var(--red)'}}>{d.license_expiry||'—'}</span>
                  {!d.license_valid&&d.license_expiry&&<span className="pill pill-red" style={{marginLeft:6}}>Expired</span>}
                  {expiresSoon(d.license_expiry)&&<span className="pill pill-yellow" style={{marginLeft:6}}>Soon</span>}
                </td>
                <td>{d.license_category||'—'}</td>
                <td><div className="score-bar"><span className="mono" style={{color:scoreColor(d.safety_score),width:32}}>{fmt(d.safety_score)}</span><div className="score-track"><div className="score-fill" style={{width:`${d.safety_score}%`,background:scoreColor(d.safety_score)}}/></div></div></td>
                <td><span className="mono">{d.completion_rate!=null?`${fmt(d.completion_rate,1)}%`:'—'}</span></td>
                <td><span className={`mono ${(d.complaints||0)>0?'':'text-sub'}`} style={{color:(d.complaints||0)>0?'var(--red)':undefined}}>{d.complaints||0}</span></td>
                <td>{statusPill(d.status)}</td>
                {can(role,'suspendDriver')&&<td><button className="btn btn-ghost btn-sm" onClick={()=>toggleStatus(d)}>{d.status==='suspended'?'Reinstate':d.status==='off_duty'?'Set On Duty':'Suspend'}</button></td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showForm&&can(role,'addDriver')&&(
        <div className="modal-bg" onClick={()=>setShowForm(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div className="modal-title">Add Driver</div>
            {err&&<div className="alert alert-err">{err}</div>}
            <div className="field"><label>Full Name *</label><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></div>
            <div className="form-row">
              <div className="field"><label>License Number</label><input value={form.license_number} onChange={e=>setForm({...form,license_number:e.target.value})}/></div>
              <div className="field"><label>Category</label><select value={form.license_category} onChange={e=>setForm({...form,license_category:e.target.value})}><option>Truck</option><option>Van</option><option>Bike</option></select></div>
            </div>
            <div className="field"><label>License Expiry</label><input type="date" value={form.license_expiry} onChange={e=>setForm({...form,license_expiry:e.target.value})}/></div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={()=>setShowForm(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={submit}>Add Driver</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── TRIPS ────────────────────────────────────────────────────────────────────
function Trips({ role }) {
  const [trips,setTrips]=useState([]); const [vehicles,setVehicles]=useState([]); const [drivers,setDrivers]=useState([]);
  const [showForm,setShowForm]=useState(false); const [err,setErr]=useState('');
  const [form,setForm]=useState({vehicle_id:'',driver_id:'',cargo_weight:'',origin:'',destination:'',revenue:'',estimated_fuel_cost:''});
  const [tab,setTab]=useState('all');

  const load=useCallback(()=>Promise.all([
    axios.get('/trips').then(r=>setTrips(r.data)),
    axios.get('/vehicles?status=available').then(r=>setVehicles(r.data)),
    axios.get('/drivers').then(r=>setDrivers(r.data.filter(d=>['on_duty','off_duty'].includes(d.status)&&d.license_valid))),
  ]),[]);
  useEffect(()=>{load();},[load]);

  const selVehicle = vehicles.find(v=>v.id===parseInt(form.vehicle_id));
  const selDriver  = drivers.find(d=>d.id===parseInt(form.driver_id));
  const categoryMismatch = selVehicle && selDriver && selDriver.license_category !== selVehicle.vehicle_type;
  const cargoVal  = parseFloat(form.cargo_weight)||0;
  const cargoOver = selVehicle && cargoVal > selVehicle.capacity;
  const cargoPct  = selVehicle && cargoVal ? Math.min((cargoVal/selVehicle.capacity)*100,100) : 0;
  const canSubmit = selVehicle && selDriver && cargoVal && !cargoOver && !categoryMismatch;

  const submit=async()=>{
    setErr('');
    if(!form.vehicle_id||!form.driver_id||!form.cargo_weight)return setErr('Vehicle, driver, and cargo weight are required.');
    if(cargoOver)return setErr(`Cargo (${cargoVal}kg) exceeds vehicle capacity (${selVehicle.capacity}kg).`);
    if(categoryMismatch)return setErr(`License mismatch.`);
    try{
      await axios.post('/trips',{
        ...form,
        vehicle_id:parseInt(form.vehicle_id),
        driver_id:parseInt(form.driver_id),
        cargo_weight:cargoVal,
        revenue:parseFloat(form.revenue||0),
        estimated_fuel_cost:parseFloat(form.estimated_fuel_cost||0),
      });
      setShowForm(false);
      setForm({vehicle_id:'',driver_id:'',cargo_weight:'',origin:'',destination:'',revenue:'',estimated_fuel_cost:''});
      load();
    }catch(e){setErr(e.response?.data?.error||'Trip creation failed.');}
  };

  const dispatch=async(id)=>{try{await axios.put(`/trips/${id}`,{status:'dispatched'});load();}catch(e){alert(e.response?.data?.error||'Could not dispatch.');}};
  const complete=async(id)=>{const odo=prompt('Final odometer reading (km):');if(!odo||isNaN(odo))return;await axios.put(`/trips/${id}`,{status:'completed',end_odometer:parseFloat(odo)});load();};
  const cancel=async(id)=>{if(!window.confirm('Cancel this trip?'))return;await axios.put(`/trips/${id}`,{status:'cancelled'});load();};
  const filtered=tab==='all'?trips:trips.filter(t=>t.status===tab);

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">Trip Dispatcher</div><div className="page-sub">Workflow & cargo management</div></div>
        {can(role,'createTrip')&&<button className="btn btn-primary" onClick={()=>{setErr('');setShowForm(true);load();}}>+ New Trip</button>}
      </div>
      {!can(role,'createTrip')&&<div className="role-notice">👁 Read-only: Only Managers and Dispatchers can create trips.</div>}
      <div className="tabs">
        {['all','draft','dispatched','completed','cancelled'].map(s=>(
          <div key={s} className={`tab ${tab===s?'active':''}`} onClick={()=>setTab(s)}>
            {s.charAt(0).toUpperCase()+s.slice(1)} <span style={{opacity:0.6,fontSize:10}}>({(s==='all'?trips:trips.filter(t=>t.status===s)).length})</span>
          </div>
        ))}
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>ID</th><th>Route</th><th>Vehicle</th><th>Driver</th><th>Cargo</th><th>Distance</th><th>Revenue</th><th>Est. Fuel</th><th>Status</th>{can(role,'completeTrip')&&<th>Actions</th>}</tr></thead>
          <tbody>
            {filtered.length===0&&<tr><td colSpan={10}><div className="empty">No trips in this category.</div></td></tr>}
            {filtered.map(t=>(
              <tr key={t.id}>
                <td className="mono">#{t.id}</td>
                <td>{t.origin||'—'} → {t.destination||'—'}</td>
                <td className="mono">{t.vehicle_id}</td><td className="mono">{t.driver_id}</td>
                <td className="mono">{t.cargo_weight} kg</td>
                <td className="mono">{t.distance_km?`${fmt(t.distance_km)} km`:'—'}</td>
                <td className="mono">{t.revenue?`₹${fmt(t.revenue,0)}`:'—'}</td>
                <td className="mono">{t.estimated_fuel_cost?`₹${fmt(t.estimated_fuel_cost,0)}`:'—'}</td>
                <td>{statusPill(t.status)}</td>
                {can(role,'completeTrip')&&(
                  <td><div className="flex gap-2">
                    {t.status==='draft'&&<button className="btn btn-success btn-sm" onClick={()=>dispatch(t.id)}>▶ Dispatch</button>}
                    {t.status==='dispatched'&&<>
                      <button className="btn btn-primary btn-sm" onClick={()=>complete(t.id)}>✓ Complete</button>
                      <button className="btn btn-danger btn-sm"  onClick={()=>cancel(t.id)}>✕ Cancel</button>
                    </>}
                  </div></td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showForm&&(
        <div className="modal-bg" onClick={()=>setShowForm(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div className="modal-title">Dispatch New Trip</div>
            {err&&<div className="alert alert-err">{err}</div>}
            <div className="form-row">
              <div className="field"><label>Vehicle *</label>
                <select value={form.vehicle_id} onChange={e=>setForm({...form,vehicle_id:e.target.value})}>
                  <option value="">Select vehicle</option>
                  {vehicles.map(v=><option key={v.id} value={v.id}>{v.name||v.plate} ({v.capacity}kg · {v.vehicle_type})</option>)}
                </select>
              </div>
              <div className="field"><label>Driver *</label>
                <select value={form.driver_id} onChange={e=>setForm({...form,driver_id:e.target.value})}>
                  <option value="">Select driver</option>
                  {drivers.map(d=><option key={d.id} value={d.id}>{d.name} [{d.license_category}]</option>)}
                </select>
              </div>
            </div>
            {categoryMismatch&&(
              <div className="alert alert-err">🚫 <strong>License mismatch:</strong> {selDriver.name} holds a <strong>{selDriver.license_category}</strong> license but vehicle is a <strong>{selVehicle.vehicle_type}</strong>.</div>
            )}
            <div className="field">
              <label>Cargo Weight (kg) *</label>
              <input type="number" value={form.cargo_weight} onChange={e=>setForm({...form,cargo_weight:e.target.value})}/>
              {selVehicle&&form.cargo_weight&&(
                <div style={{marginTop:6}}>
                  <div style={{fontSize:11,color:cargoOver?'var(--red)':cargoPct>80?'var(--yellow)':'var(--sub)',marginBottom:3}}>
                    {cargoOver?`⚠ Overloaded by ${(cargoVal-selVehicle.capacity).toFixed(0)}kg`:`${cargoVal.toFixed(0)} / ${selVehicle.capacity} kg`}
                  </div>
                  <div className="progress-bar"><div className="progress-fill" style={{width:`${cargoPct}%`,background:cargoOver?'var(--red)':cargoPct>80?'var(--yellow)':'var(--green)'}}/></div>
                </div>
              )}
            </div>
            <div className="form-row">
              <div className="field"><label>Origin</label><input value={form.origin} onChange={e=>setForm({...form,origin:e.target.value})}/></div>
              <div className="field"><label>Destination</label><input value={form.destination} onChange={e=>setForm({...form,destination:e.target.value})}/></div>
            </div>
            <div className="form-row">
              <div className="field"><label>Revenue (₹)</label><input type="number" value={form.revenue} onChange={e=>setForm({...form,revenue:e.target.value})}/></div>
              <div className="field"><label>Estimated Fuel Cost (₹)</label><input type="number" value={form.estimated_fuel_cost} onChange={e=>setForm({...form,estimated_fuel_cost:e.target.value})}/></div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={()=>setShowForm(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={submit} disabled={!canSubmit}>Dispatch Trip</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MAINTENANCE ──────────────────────────────────────────────────────────────
function Maintenance({ role }) {
  const [logs,setLogs]=useState([]); const [vehicles,setVehicles]=useState([]);
  const [showForm,setShowForm]=useState(false); const [err,setErr]=useState('');
  const [form,setForm]=useState({vehicle_id:'',service_type:'',description:'',cost:'',date:''});
  const load=()=>Promise.all([axios.get('/maintenance').then(r=>setLogs(r.data)),axios.get('/vehicles').then(r=>setVehicles(r.data))]);
  useEffect(()=>{load();},[]);
  const submit=async()=>{setErr('');if(!form.vehicle_id)return setErr('Select a vehicle.');try{await axios.post('/maintenance',{...form,vehicle_id:parseInt(form.vehicle_id),cost:parseFloat(form.cost||0)});setShowForm(false);setForm({vehicle_id:'',service_type:'',description:'',cost:'',date:''});load();}catch(e){setErr(e.response?.data?.error||'Error.');}};
  const resolve=async(id)=>{await axios.put(`/maintenance/${id}/resolve`);load();};
  const vMap=Object.fromEntries(vehicles.map(v=>[v.id,v]));
  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">Maintenance Logs</div><div className="page-sub">Service history & auto-shop logic</div></div>
        {can(role,'logMaintenance')&&<button className="btn btn-primary" onClick={()=>{setErr('');setShowForm(true);}}>+ Log Service</button>}
      </div>
      {!can(role,'logMaintenance')&&<div className="role-notice">👁 Read-only: Only Managers can log maintenance.</div>}
      <div className="table-wrap">
        <table>
          <thead><tr><th>Vehicle</th><th>Service Type</th><th>Description</th><th>Cost</th><th>Date</th><th>Maint. Status</th>{can(role,'resolveMaint')&&<th>Actions</th>}</tr></thead>
          <tbody>
            {logs.length===0&&<tr><td colSpan={7}><div className="empty">No maintenance records.</div></td></tr>}
            {logs.map(m=>(
              <tr key={m.id}>
                <td><div className="mono">{vMap[m.vehicle_id]?.plate||`#${m.vehicle_id}`}</div><div className="text-sub text-sm">{vMap[m.vehicle_id]?.name}</div></td>
                <td>{m.service_type}</td><td className="text-sub">{m.description||'—'}</td>
                <td className="mono">₹{fmt(m.cost,2)}</td><td>{m.date}</td>
                <td>{statusPill(m.resolved?'resolved':'new')}</td>
                {can(role,'resolveMaint')&&<td>{vMap[m.vehicle_id]?.status==='in_shop'&&<button className="btn btn-primary btn-sm" onClick={()=>resolve(m.id)}>✓ Mark Done</button>}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showForm&&can(role,'logMaintenance')&&(
        <div className="modal-bg" onClick={()=>setShowForm(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div className="modal-title">Log Maintenance</div>
            {err&&<div className="alert alert-err">{err}</div>}
            <div className="alert alert-warn" style={{fontSize:12}}>⚡ Vehicle will auto-switch to <strong>In Shop</strong>.</div>
            <div className="field"><label>Vehicle *</label>
              <select value={form.vehicle_id} onChange={e=>setForm({...form,vehicle_id:e.target.value})}>
                <option value="">Select vehicle</option>
                {vehicles.filter(v=>v.status!=='retired').map(v=><option key={v.id} value={v.id}>{v.name||v.plate} — {v.status}</option>)}
              </select>
            </div>
            <div className="form-row">
              <div className="field"><label>Service Type</label><input placeholder="Oil Change" value={form.service_type} onChange={e=>setForm({...form,service_type:e.target.value})}/></div>
              <div className="field"><label>Cost (₹)</label><input type="number" value={form.cost} onChange={e=>setForm({...form,cost:e.target.value})}/></div>
            </div>
            <div className="field"><label>Description</label><input value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></div>
            <div className="field"><label>Date</label><input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/></div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={()=>setShowForm(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={submit}>Log Service</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── FUEL LOGS ────────────────────────────────────────────────────────────────
function FuelLogs({ role }) {
  const [logs,setLogs]=useState([]); const [vehicles,setVehicles]=useState([]); const [trips,setTrips]=useState([]);
  const [showForm,setShowForm]=useState(false); const [err,setErr]=useState('');
  const [form,setForm]=useState({vehicle_id:'',trip_id:'',liters:'',cost:'',misc_expense:'',date:'',odometer_at_fill:'',distance_km:''});
  const load=()=>Promise.all([
    axios.get('/fuel').then(r=>setLogs(r.data)),
    axios.get('/vehicles').then(r=>setVehicles(r.data)),
    axios.get('/trips').then(r=>setTrips(r.data.filter(t=>t.status==='completed'))),
  ]);
  useEffect(()=>{load();},[]);
  const submit=async()=>{
    setErr('');
    if(!form.vehicle_id||!form.liters||!form.cost)return setErr('Vehicle, liters, and cost are required.');
    try{
      await axios.post('/fuel',{
        ...form,
        vehicle_id:parseInt(form.vehicle_id),
        trip_id:form.trip_id?parseInt(form.trip_id):null,
        liters:parseFloat(form.liters),
        cost:parseFloat(form.cost),
        misc_expense:parseFloat(form.misc_expense||0),
        distance_km:parseFloat(form.distance_km||0),
        odometer_at_fill:parseFloat(form.odometer_at_fill||0),
      });
      setShowForm(false);
      setForm({vehicle_id:'',trip_id:'',liters:'',cost:'',misc_expense:'',date:'',odometer_at_fill:'',distance_km:''});
      load();
    }catch(e){setErr(e.response?.data?.error||'Error.');}
  };
  const vMap=Object.fromEntries(vehicles.map(v=>[v.id,v]));
  const totalCost=logs.reduce((s,l)=>s+l.cost,0);
  const totalLiters=logs.reduce((s,l)=>s+l.liters,0);
  const totalMisc=logs.reduce((s,l)=>s+(l.misc_expense||0),0);
  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">Fuel & Expenses</div><div className="page-sub">Per-trip financial tracking</div></div>
        {can(role,'logFuel')&&<button className="btn btn-primary" onClick={()=>{setErr('');setShowForm(true);}}>+ Log Fuel</button>}
      </div>
      {!can(role,'logFuel')&&<div className="role-notice">👁 Read-only: Only Managers and Analysts can log fuel.</div>}
      <div className="kpi-grid" style={{gridTemplateColumns:'repeat(4,1fr)',marginBottom:20}}>
        <div className="kpi-card" style={{'--accent-clr':'var(--accent)'}}><div className="kpi-label">Total Fuel Cost</div><div className="kpi-value" style={{color:'var(--accent)',fontSize:22}}>₹{fmt(totalCost,2)}</div></div>
        <div className="kpi-card" style={{'--accent-clr':'var(--accent2)'}}><div className="kpi-label">Total Liters</div><div className="kpi-value" style={{color:'var(--accent2)',fontSize:22}}>{fmt(totalLiters,1)} L</div></div>
        <div className="kpi-card" style={{'--accent-clr':'var(--green)'}}><div className="kpi-label">Avg Cost / Liter</div><div className="kpi-value" style={{color:'var(--green)',fontSize:22}}>₹{totalLiters?fmt(totalCost/totalLiters,2):'—'}</div></div>
        <div className="kpi-card" style={{'--accent-clr':'var(--yellow)'}}><div className="kpi-label">Misc Expenses</div><div className="kpi-value" style={{color:'var(--yellow)',fontSize:22}}>₹{fmt(totalMisc,2)}</div></div>
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Vehicle</th><th>Trip</th><th>Liters</th><th>Fuel Cost</th><th>Misc Expense</th><th>Distance</th><th>Odometer</th><th>Date</th></tr></thead>
          <tbody>
            {logs.length===0&&<tr><td colSpan={8}><div className="empty">No fuel logs yet.</div></td></tr>}
            {logs.map(f=>(
              <tr key={f.id}>
                <td><span className="mono">{vMap[f.vehicle_id]?.plate||`#${f.vehicle_id}`}</span></td>
                <td>{f.trip_id?<span className="mono">#{f.trip_id}</span>:'—'}</td>
                <td className="mono">{fmt(f.liters,1)} L</td>
                <td className="mono">₹{fmt(f.cost,2)}</td>
                <td className="mono">{f.misc_expense?`₹${fmt(f.misc_expense,2)}`:'—'}</td>
                <td className="mono">{f.distance_km?`${fmt(f.distance_km,1)} km`:'—'}</td>
                <td className="mono">{f.odometer_at_fill?`${fmt(f.odometer_at_fill)} km`:'—'}</td>
                <td>{f.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showForm&&can(role,'logFuel')&&(
        <div className="modal-bg" onClick={()=>setShowForm(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div className="modal-title">Log Fuel Fill</div>
            {err&&<div className="alert alert-err">{err}</div>}
            <div className="field"><label>Vehicle *</label><select value={form.vehicle_id} onChange={e=>setForm({...form,vehicle_id:e.target.value})}><option value="">Select</option>{vehicles.map(v=><option key={v.id} value={v.id}>{v.name||v.plate}</option>)}</select></div>
            <div className="field"><label>Link to Completed Trip</label><select value={form.trip_id} onChange={e=>setForm({...form,trip_id:e.target.value})}><option value="">None</option>{trips.map(t=><option key={t.id} value={t.id}>Trip #{t.id} — {t.origin} → {t.destination}</option>)}</select></div>
            <div className="form-row">
              <div className="field"><label>Liters *</label><input type="number" step="0.1" value={form.liters} onChange={e=>setForm({...form,liters:e.target.value})}/></div>
              <div className="field"><label>Fuel Cost (₹) *</label><input type="number" value={form.cost} onChange={e=>setForm({...form,cost:e.target.value})}/></div>
            </div>
            <div className="form-row">
              <div className="field"><label>Misc Expense (₹)</label><input type="number" value={form.misc_expense} onChange={e=>setForm({...form,misc_expense:e.target.value})} placeholder="Tolls, parking…"/></div>
              <div className="field"><label>Distance (km)</label><input type="number" value={form.distance_km} onChange={e=>setForm({...form,distance_km:e.target.value})}/></div>
            </div>
            <div className="form-row">
              <div className="field"><label>Odometer (km)</label><input type="number" value={form.odometer_at_fill} onChange={e=>setForm({...form,odometer_at_fill:e.target.value})}/></div>
              <div className="field"><label>Date</label><input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/></div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={()=>setShowForm(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={submit}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MONTHLY SEED DATA ────────────────────────────────────────────────────────
const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const seedMonthly = () => MONTH_LABELS.map((month)=>({
  month,
  revenue:    Math.round(180000+Math.random()*120000),
  fuel_cost:  Math.round(40000+Math.random()*30000),
  maintenance:Math.round(10000+Math.random()*15000),
  efficiency: parseFloat((8+Math.random()*6).toFixed(1)),
})).map(r=>({...r, net_profit:r.revenue-r.fuel_cost-r.maintenance}));

// ─── ANALYTICS ────────────────────────────────────────────────────────────────
function Analytics({ role }) {
  const [vehicles,   setVehicles] = useState([]);
  const [drivers,    setDrivers]  = useState([]);
  const [monthlyData,setMonthly]  = useState([]);
  const [tab,        setTab]      = useState(role==='safety_officer'?'drivers':'vehicles');

  useEffect(()=>{
    axios.get('/analytics').then(r=>setVehicles(r.data)).catch(()=>{});
    axios.get('/analytics/drivers').then(r=>setDrivers(r.data)).catch(()=>{});
    axios.get('/analytics/monthly').then(r=>setMonthly(r.data)).catch(()=>setMonthly(seedMonthly()));
  },[]);

  const exportCSV=(data,name)=>{
    if(!data.length)return;
    const keys=Object.keys(data[0]);
    const csv=[keys.join(','),...data.map(r=>keys.map(k=>JSON.stringify(r[k]??'')).join(','))].join('\n');
    const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download=`${name}_${new Date().toISOString().slice(0,10)}.csv`;a.click();
  };

  const exportPDF=async()=>{
    const jsPDF=await loadJsPDF();
    const doc=new jsPDF();
    let y=20;
    doc.setFontSize(18);doc.setFont('helvetica','bold');doc.text('FleetFlow Analytics Report',14,y);y+=8;
    doc.setFontSize(9);doc.setFont('helvetica','normal');doc.setTextColor(100);
    doc.text(`Generated: ${new Date().toLocaleString()}  |  Role: ${role}`,14,y);y+=12;doc.setTextColor(0);
    if(vehicles.length&&role!=='safety_officer'){
      doc.setFontSize(12);doc.setFont('helvetica','bold');doc.text('Vehicle ROI Summary',14,y);y+=6;
      doc.setFontSize(7);
      const vH=['Plate','Name','Trips','KM','Fuel ₹','Maint ₹','Revenue ₹','ROI%'];
      const vW=[20,28,12,18,20,20,24,14];
      let x=14;doc.setFont('helvetica','bold');vH.forEach((h,i)=>{doc.text(h,x,y);x+=vW[i];});y+=5;
      doc.setFont('helvetica','normal');
      vehicles.forEach(v=>{
        if(y>270){doc.addPage();y=20;}x=14;
        [v.plate,v.name||'—',String(v.total_trips),fmt(v.total_km,1),fmt(v.total_fuel_cost,0),fmt(v.total_maintenance_cost,0),fmt(v.total_revenue,0),`${fmt(v.roi_percent,1)}%`]
          .forEach((val,i)=>{doc.text(String(val),x,y);x+=vW[i];});y+=5;
      });y+=8;
    }
    if(drivers.length){
      if(y>230){doc.addPage();y=20;}
      doc.setFontSize(12);doc.setFont('helvetica','bold');doc.text('Driver Performance Summary',14,y);y+=6;
      doc.setFontSize(7);
      const dH=['Name','Trips','Done','Completion%','Safety','License','Status'];
      const dW=[35,12,12,22,14,24,18];
      let x=14;doc.setFont('helvetica','bold');dH.forEach((h,i)=>{doc.text(h,x,y);x+=dW[i];});y+=5;
      doc.setFont('helvetica','normal');
      drivers.forEach(d=>{
        if(y>270){doc.addPage();y=20;}x=14;
        [d.name,String(d.total_trips),String(d.completed_trips),`${fmt(d.completion_rate,1)}%`,fmt(d.safety_score),d.license_expiry||'N/A',d.status]
          .forEach((val,i)=>{doc.text(String(val),x,y);x+=dW[i];});y+=5;
      });
    }
    doc.save(`fleetflow_report_${new Date().toISOString().slice(0,10)}.pdf`);
  };

  const finSummary = monthlyData.slice(-6);
  const top5costly = [...vehicles].sort((a,b)=>(b.total_operational_cost||0)-(a.total_operational_cost||0)).slice(0,5).map(v=>({
    name: v.name||v.plate||`V${v.vehicle_id}`,
    cost: Math.round(v.total_operational_cost||0),
    revenue: Math.round(v.total_revenue||0),
  }));
  const tooltipStyle = { backgroundColor:'var(--surface)', border:'1px solid var(--border)', borderRadius:6, fontSize:12 };

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">Analytics & Reports</div><div className="page-sub">Financial performance & efficiency</div></div>
        <div className="flex gap-2">
          <button className="btn btn-secondary btn-sm" onClick={()=>exportCSV(tab==='vehicles'?vehicles:drivers,tab)}>⬇ CSV</button>
          <button className="btn btn-secondary btn-sm" onClick={exportPDF}>⬇ PDF</button>
        </div>
      </div>

      {role!=='safety_officer' && (
        <div className="chart-grid">
          <div className="chart-panel">
            <div className="chart-title">Fuel Efficiency Trend (km/L)</div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={monthlyData} margin={{top:4,right:8,left:-20,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/>
                <XAxis dataKey="month" tick={{fontSize:11,fill:'var(--sub)'}}/>
                <YAxis tick={{fontSize:11,fill:'var(--sub)'}}/>
                <Tooltip contentStyle={tooltipStyle}/>
                <Line type="monotone" dataKey="efficiency" stroke="var(--green)" strokeWidth={2} dot={{r:3}} name="km/L"/>
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-panel">
            <div className="chart-title">Top 5 Costliest Vehicles (₹)</div>
            {top5costly.length===0 ? (
              <div className="empty" style={{padding:24}}>No vehicle data yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={top5costly} margin={{top:4,right:8,left:-20,bottom:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/>
                  <XAxis dataKey="name" tick={{fontSize:10,fill:'var(--sub)'}}/>
                  <YAxis tick={{fontSize:10,fill:'var(--sub)'}}/>
                  <Tooltip contentStyle={tooltipStyle} formatter={(v)=>`₹${v.toLocaleString()}`}/>
                  <Legend wrapperStyle={{fontSize:11}}/>
                  <Bar dataKey="cost" fill="var(--red)" name="Op. Cost" radius={[3,3,0,0]}/>
                  <Bar dataKey="revenue" fill="var(--green)" name="Revenue" radius={[3,3,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="chart-panel" style={{gridColumn:'1/-1'}}>
            <div className="chart-title">Monthly Revenue vs Costs (₹)</div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={monthlyData} margin={{top:4,right:20,left:0,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/>
                <XAxis dataKey="month" tick={{fontSize:11,fill:'var(--sub)'}}/>
                <YAxis tick={{fontSize:11,fill:'var(--sub)'}} tickFormatter={v=>`₹${(v/1000).toFixed(0)}k`}/>
                <Tooltip contentStyle={tooltipStyle} formatter={(v)=>`₹${v.toLocaleString()}`}/>
                <Legend wrapperStyle={{fontSize:11}}/>
                <Line type="monotone" dataKey="revenue"     stroke="var(--green)"  strokeWidth={2} dot={false} name="Revenue"/>
                <Line type="monotone" dataKey="fuel_cost"   stroke="var(--accent)" strokeWidth={2} dot={false} name="Fuel Cost"/>
                <Line type="monotone" dataKey="maintenance" stroke="var(--yellow)" strokeWidth={2} dot={false} name="Maintenance"/>
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {role!=='safety_officer' && finSummary.length>0 && (
        <div className="panel" style={{marginBottom:24}}>
          <div className="panel-title">Financial Summary — Last 6 Months</div>
          <div className="table-wrap">
            <table className="fin-table">
              <thead><tr><th>Month</th><th>Revenue (₹)</th><th>Fuel Cost (₹)</th><th>Maintenance (₹)</th><th>Net Profit (₹)</th></tr></thead>
              <tbody>
                {finSummary.map(row=>(
                  <tr key={row.month}>
                    <td><strong>{row.month}</strong></td>
                    <td className="mono" style={{color:'var(--green)'}}>₹{(row.revenue||0).toLocaleString()}</td>
                    <td className="mono" style={{color:'var(--accent)'}}>₹{(row.fuel_cost||0).toLocaleString()}</td>
                    <td className="mono" style={{color:'var(--yellow)'}}>₹{(row.maintenance||0).toLocaleString()}</td>
                    <td className={`mono ${(row.net_profit||0)>=0?'roi-positive':'roi-negative'}`}>
                      {(row.net_profit||0)>=0?'↑':'↓'} ₹{Math.abs(row.net_profit||0).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="tabs">
        {role!=='safety_officer'&&<div className={`tab ${tab==='vehicles'?'active':''}`} onClick={()=>setTab('vehicles')}>Vehicle ROI</div>}
        <div className={`tab ${tab==='drivers'?'active':''}`} onClick={()=>setTab('drivers')}>Driver Performance</div>
      </div>

      {tab==='vehicles'&&(
        <div className="table-wrap">
          <table>
            <thead><tr><th>Vehicle</th><th>Trips</th><th>KM</th><th>Fuel</th><th>Maint.</th><th>Op. Cost</th><th>Revenue</th><th>km/L</th><th>₹/km</th><th>ROI %</th></tr></thead>
            <tbody>
              {vehicles.length===0&&<tr><td colSpan={10}><div className="empty">No data yet. Complete some trips and log fuel first.</div></td></tr>}
              {vehicles.map(v=>(
                <tr key={v.vehicle_id}>
                  <td><div>{v.name||'—'}</div><span className="mono text-sm">{v.plate}</span></td>
                  <td className="mono">{v.total_trips}</td><td className="mono">{fmt(v.total_km,1)}</td>
                  <td className="mono">₹{fmt(v.total_fuel_cost,0)}</td><td className="mono">₹{fmt(v.total_maintenance_cost,0)}</td>
                  <td className="mono">₹{fmt(v.total_operational_cost,0)}</td><td className="mono">₹{fmt(v.total_revenue,0)}</td>
                  <td className="mono">{fmt(v.fuel_efficiency_km_per_l,2)}</td><td className="mono">₹{fmt(v.cost_per_km,2)}</td>
                  <td className={`mono ${v.roi_percent>=0?'roi-positive':'roi-negative'}`}>{fmt(v.roi_percent,1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {tab==='drivers'&&(
        <div className="table-wrap">
          <table>
            <thead><tr><th>Driver</th><th>Total</th><th>Done</th><th>Completion %</th><th>Safety Score</th><th>License</th><th>Status</th></tr></thead>
            <tbody>
              {drivers.length===0&&<tr><td colSpan={7}><div className="empty">No driver data yet.</div></td></tr>}
              {drivers.map(d=>(
                <tr key={d.driver_id}>
                  <td>{d.name}</td><td className="mono">{d.total_trips}</td><td className="mono">{d.completed_trips}</td>
                  <td><div className="score-bar"><span className="mono" style={{width:36}}>{fmt(d.completion_rate,1)}%</span><div className="score-track"><div className="score-fill" style={{width:`${d.completion_rate}%`,background:'var(--accent2)'}}/></div></div></td>
                  <td><div className="score-bar"><span className="mono" style={{width:28,color:scoreColor(d.safety_score)}}>{fmt(d.safety_score)}</span><div className="score-track"><div className="score-fill" style={{width:`${d.safety_score}%`,background:scoreColor(d.safety_score)}}/></div></div></td>
                  <td style={{color:d.license_valid?'var(--green)':'var(--red)'}}>{d.license_expiry||'—'}</td>
                  <td>{statusPill(d.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── PAGE MAP ─────────────────────────────────────────────────────────────────
const PAGES = { dashboard:Dashboard, vehicles:Vehicles, drivers:Drivers, trips:Trips, maintenance:Maintenance, fuel:FuelLogs, analytics:Analytics };
const ROLE_LABELS = { manager:'Manager', dispatcher:'Dispatcher', safety_officer:'Safety Officer', analyst:'Analyst' };

// ─── ROOT APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [token, setToken] = useState(()=>localStorage.getItem('ff_token')||'');
  const [role,  setRole]  = useState(()=>localStorage.getItem('ff_role')||'');
  const [email, setEmail] = useState(()=>localStorage.getItem('ff_email')||'');
  const [page,  setPage]  = useState('dashboard');

  useEffect(()=>{
    const saved = localStorage.getItem('ff_token');
    if (saved) apiSet(saved);
  },[]);

  const onLogin=(t,r,em)=>{
    localStorage.setItem('ff_token',t);localStorage.setItem('ff_role',r);localStorage.setItem('ff_email',em);
    apiSet(t);setToken(t);setRole(r);setEmail(em);
  };

  const logout=()=>{
    localStorage.removeItem('ff_token');localStorage.removeItem('ff_role');localStorage.removeItem('ff_email');
    delete axios.defaults.headers.common['Authorization'];
    setToken('');setRole('');setEmail('');setPage('dashboard');
  };

  const pageProps = { role, onNavigate: setPage };
  const PageComponent = PAGES[page] || Dashboard;

  return (
    <>
      <style>{css}</style>
      {!token ? <Login onLogin={onLogin}/> : (
        <div className="app">
          <nav className="sidebar">
            <div className="sidebar-logo">Fleet<span>Flow</span></div>
            {NAV.map((item,i)=>
              item.section
                ? <div className="nav-section" key={i}>{item.section}</div>
                : <div key={item.id} className={`nav-item ${page===item.id?'active':''}`} onClick={()=>setPage(item.id)}>
                    <span>{item.icon}</span>{item.label}
                  </div>
            )}
            <div className="sidebar-bottom">
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
                <div className="avatar-sm">{initials(email)}</div>
                <div>
                  <div className="sidebar-user">{email}</div>
                  <div className="sidebar-role">{ROLE_LABELS[role]||role}</div>
                </div>
              </div>
              <button className="btn btn-danger btn-sm" style={{width:'100%'}} onClick={logout}>⎋ Sign Out</button>
            </div>
          </nav>

          <div className="topbar">
            <GlobalSearch onNavigate={setPage}/>
            <div style={{marginLeft:'auto'}}>
              <span style={{fontSize:12,color:'var(--sub)'}}>{ROLE_LABELS[role]}</span>
            </div>
          </div>

          <main className="main-with-topbar">
            <PageComponent {...pageProps}/>
          </main>
        </div>
      )}
    </>
  );
}