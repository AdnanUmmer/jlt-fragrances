import React, { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import http from "../lib/api";

export const AdminLogin = () => {
  const [form, setForm] = useState({ email: "admin@jltfragrances.com", password: "" });
  const [err, setErr] = useState("");
  const nav = useNavigate();
  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    try {
      const r = await http.post("/auth/login", form);
      localStorage.setItem("jlt_admin_token", r.data.token);
      nav("/admin");
    } catch (ex) {
      setErr(typeof ex.response?.data?.detail === "string" ? ex.response.data.detail : "Login failed");
    }
  };
  return (
    <div className="max-w-md mx-auto px-6 py-16" data-testid="admin-login">
      <div className="text-center mb-8">
        <div className="text-[0.7rem] tracking-[0.3em] uppercase text-jlt-gold">Admin</div>
        <h1 className="font-display text-4xl mt-2">Login</h1>
      </div>
      <form onSubmit={submit} className="bg-white border border-jlt-black/10 p-6 space-y-3">
        <input className="input-luxe" type="email" required value={form.email} onChange={(e)=>setForm({...form,email:e.target.value})} data-testid="admin-email"/>
        <input className="input-luxe" type="password" required placeholder="Password" value={form.password} onChange={(e)=>setForm({...form,password:e.target.value})} data-testid="admin-password"/>
        {err && <div className="text-sm text-red-600" data-testid="admin-error">{err}</div>}
        <button type="submit" className="btn-primary w-full justify-center" data-testid="admin-submit">Login</button>
      </form>
    </div>
  );
};

export const AdminDashboard = () => {
  const [me, setMe] = useState(null);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [file, setFile] = useState(null);
  const [importMsg, setImportMsg] = useState("");
  const nav = useNavigate();

  useEffect(() => {
    http.get("/auth/me").then((r) => setMe(r.data)).catch(() => nav("/admin/login"));
  }, [nav]);

  const load = () => {
    const qp = new URLSearchParams({ page: String(page), limit: "20" });
    if (q) qp.set("q", q);
    http.get(`/products?${qp.toString()}`).then((r) => { setItems(r.data.items); setTotal(r.data.total); });
  };
  useEffect(load, [page, q]);

  const del = async (slug) => {
    if (!window.confirm("Delete this product?")) return;
    await http.delete(`/admin/products/${slug}`);
    load();
  };

  const importCsv = async (e) => {
    e.preventDefault();
    if (!file) return;
    const fd = new FormData(); fd.append("file", file);
    const r = await http.post("/admin/products/import-csv", fd, { headers: { "Content-Type": "multipart/form-data" } });
    setImportMsg(`Imported ${r.data.inserted} products`);
    load();
  };

  const logout = () => { localStorage.removeItem("jlt_admin_token"); nav("/admin/login"); };

  if (!me) return <div className="p-10 text-center" data-testid="admin-loading">Loading…</div>;

  return (
    <div className="max-w-7xl mx-auto px-6 py-10" data-testid="admin-dashboard">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="font-display text-3xl">Admin Dashboard</h1>
          <div className="text-xs text-jlt-black/60">{me.email} · {total} products</div>
        </div>
        <button onClick={logout} className="btn-outline" data-testid="admin-logout">Logout</button>
      </div>

      <div className="bg-white border border-jlt-black/10 p-5 mb-6">
        <div className="text-[0.7rem] tracking-[0.3em] uppercase text-jlt-gold mb-2">Bulk Import (CSV)</div>
        <form onSubmit={importCsv} className="flex flex-wrap gap-3 items-center">
          <input type="file" accept=".csv" onChange={(e)=>setFile(e.target.files[0])} data-testid="csv-input"/>
          <button className="btn-primary" data-testid="csv-import">Import CSV</button>
          {importMsg && <span className="text-sm text-jlt-gold">{importMsg}</span>}
        </form>
        <div className="text-xs text-jlt-black/60 mt-2">CSV columns: <code>brand_inspiration, name</code></div>
      </div>

      <input className="input-luxe mb-4" placeholder="Search products…" value={q} onChange={(e)=>{setPage(1); setQ(e.target.value);}} data-testid="admin-search"/>

      <div className="bg-white border border-jlt-black/10 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-jlt-bone text-left">
            <tr><th className="p-3">Name</th><th className="p-3">Brand</th><th className="p-3">Gender</th><th className="p-3">Family</th><th className="p-3">Bestseller</th><th className="p-3">Actions</th></tr>
          </thead>
          <tbody>
            {items.map((p) => (
              <tr key={p.slug} className="border-t border-jlt-black/10" data-testid={`admin-row-${p.slug}`}>
                <td className="p-3 font-display">{p.name}</td>
                <td className="p-3">{p.brand_inspiration}</td>
                <td className="p-3">{p.gender}</td>
                <td className="p-3">{p.scent_family.join(", ")}</td>
                <td className="p-3">{p.is_bestseller ? "★" : "—"}</td>
                <td className="p-3"><button onClick={() => del(p.slug)} className="text-red-600 text-xs" data-testid={`admin-delete-${p.slug}`}>Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-center gap-3 mt-6">
        <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn-outline disabled:opacity-40">Prev</button>
        <span className="self-center text-sm">Page {page} / {Math.max(1, Math.ceil(total / 20))}</span>
        <button disabled={page * 20 >= total} onClick={() => setPage(p => p + 1)} className="btn-outline disabled:opacity-40">Next</button>
      </div>
    </div>
  );
};
