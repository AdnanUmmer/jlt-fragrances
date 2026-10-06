import React,{useState} from 'react';
import {Link,useNavigate} from 'react-router-dom';
import {Eye,EyeOff,ArrowRight,LockKeyhole} from 'lucide-react';
import http from '../lib/api';

export default function AdminLogin(){
  const [username,setUsername]=useState('');const [password,setPassword]=useState('');
  const [show,setShow]=useState(false);const [busy,setBusy]=useState(false);const [error,setError]=useState('');const nav=useNavigate();
  const submit=async e=>{e.preventDefault();setError('');setBusy(true);try{const r=await http.post('/auth/login',{username,password});localStorage.setItem('jlt_admin_token',r.data.token);nav('/admin');}catch(e){setError(e.response?.status===401?'The username or password is incorrect. Please try again.':'Unable to sign in. Check the connection and try again.');}finally{setBusy(false);}};
  return <main className="admin-login-shell"><div className="admin-login-card">
    <Link to="/" aria-label="JLT Fragrances home"><img src="/logo.jpg" alt="JLT Fragrances" className="h-20 mx-auto object-contain"/></Link>
    <div className="text-center mt-7 mb-8"><p className="text-xs tracking-[0.28em] text-jlt-gold uppercase">Just Like That Fragrances</p><h1 className="font-display text-4xl mt-3">Admin Portal</h1><p className="text-sm text-jlt-black/60 mt-2">A considered collection. Carefully managed.</p></div>
    <form onSubmit={submit} className="space-y-5" aria-label="Admin login">
      <label className="block text-sm">Username<input className="input-luxe mt-2" name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} required value={username} onChange={e=>setUsername(e.target.value)} disabled={busy}/></label>
      <label className="block text-sm">Password<div className="relative mt-2"><input className="input-luxe !pr-14" type={show?'text':'password'} name="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)} disabled={busy}/><button type="button" aria-label={show?'Hide password':'Show password'} aria-pressed={show} className="absolute right-1 top-1 tap-target" onClick={()=>setShow(s=>!s)}>{show?<EyeOff size={18}/>:<Eye size={18}/>}</button></div></label>
      {error&&<p className="text-sm text-red-700 bg-red-50 border border-red-100 p-3" role="alert">{error}</p>}
      <button disabled={busy} className="btn-primary w-full justify-between">{busy?'Signing in…':'Sign in'}<ArrowRight size={16}/></button>
    </form><div className="flex justify-center gap-2 text-xs text-jlt-black/50 mt-7"><LockKeyhole size={14}/><span>Authorized access only</span></div><Link to="/" className="block text-center text-sm text-jlt-gold mt-6 py-2">Return to the storefront</Link>
  </div></main>;
}
