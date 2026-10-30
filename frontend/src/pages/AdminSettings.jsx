import React, { useEffect, useState } from "react";
import http from "../lib/api";

const errText = (e, fallback) => (typeof e.response?.data?.detail === "string" ? e.response.data.detail : fallback);
const blankSeo = { path: "/", title: "", description: "", canonical_url: "", og_title: "", og_description: "", og_image: "", noindex: false };

export const ShippingSettingsPanel = () => {
  const [s, setS] = useState(null);
  const [msg, setMsg] = useState("");
  useEffect(() => { http.get("/admin/shipping-settings").then((r) => setS(r.data)).catch(() => setMsg("Unable to load shipping settings.")); }, []);
  if (!s) return <p className="text-sm">{msg || "Loading shipping settings…"}</p>;
  const num = (key) => (e) => setS({ ...s, [key]: Number(e.target.value) });
  const save = async (e) => {
    e.preventDefault();
    try { const r = await http.put("/admin/shipping-settings", s); setS(r.data.settings); setMsg("Shipping settings saved."); }
    catch (err) { setMsg(errText(err, "Unable to save. Use whole, non-negative amounts.")); }
  };
  return (
    <section className="bg-white border border-jlt-black/10 p-5 mb-6" data-testid="admin-shipping">
      <h2 className="font-display text-2xl">Shipping</h2>
      <form onSubmit={save} className="grid sm:grid-cols-4 gap-3 mt-3 items-end">
        <label className="text-xs">Threshold (₹)<input className="input-luxe" type="number" min="0" value={s.threshold} onChange={num("threshold")} /></label>
        <label className="text-xs">Charge below threshold (₹)<input className="input-luxe" type="number" min="0" value={s.charge_below_threshold} onChange={num("charge_below_threshold")} /></label>
        <label className="text-xs">Charge at/above threshold (₹)<input className="input-luxe" type="number" min="0" value={s.charge_at_or_above_threshold} onChange={num("charge_at_or_above_threshold")} /></label>
        <label className="text-xs flex items-center gap-2"><input type="checkbox" checked={s.enabled} onChange={(e) => setS({ ...s, enabled: e.target.checked })} /> Charge shipping</label>
        <button className="btn-primary sm:col-span-4 w-fit">Save shipping</button>
      </form>
      {msg && <p className="text-sm mt-2" role="status">{msg}</p>}
    </section>
  );
};

export const SeoManagerPanel = () => {
  const [data, setData] = useState({ items: [], static_paths: [] });
  const [form, setForm] = useState(blankSeo);
  const [msg, setMsg] = useState("");
  const load = () => http.get("/admin/seo").then((r) => setData(r.data)).catch(() => setMsg("Unable to load SEO entries."));
  useEffect(() => { load(); }, []);
  const field = (key) => ({ value: form[key], onChange: (e) => setForm({ ...form, [key]: e.target.value }) });
  const edit = async (path) => {
    const r = await http.get("/seo", { params: { path } });
    const custom = data.items.find((i) => i.path === path) || {};
    setForm({ ...blankSeo, ...r.data, ...custom, path, title: custom.title ?? r.data.title.replace(/ \| JLT Fragrances$/, "") });
  };
  const save = async (e) => {
    e.preventDefault();
    try { await http.put("/admin/seo", form); setMsg("SEO saved."); load(); }
    catch (err) { setMsg(errText(err, "Unable to save. Path must start with / and URLs must be valid.")); }
  };
  const remove = async (path) => {
    try { await http.delete("/admin/seo", { params: { path } }); setMsg("Custom SEO removed; defaults apply."); load(); }
    catch (err) { setMsg(errText(err, "Unable to remove.")); }
  };
  return (
    <section className="bg-white border border-jlt-black/10 p-5 mb-6" data-testid="admin-seo">
      <h2 className="font-display text-2xl">SEO manager</h2>
      <p className="text-xs text-jlt-black/60 mt-1">Leave a field blank to use the automatic default. Product pages use /product/&lt;slug&gt;.</p>
      <div className="flex flex-wrap gap-2 mt-3">
        {data.static_paths.map((p) => <button type="button" key={p} className="btn-outline !py-1 !px-2 text-xs" onClick={() => edit(p)}>{p}</button>)}
      </div>
      <form onSubmit={save} className="grid sm:grid-cols-2 gap-3 mt-3">
        <label className="text-xs">Page path<input className="input-luxe" required {...field("path")} /></label>
        <label className="text-xs">Meta title (≤120)<input className="input-luxe" maxLength={120} {...field("title")} /></label>
        <label className="text-xs sm:col-span-2">Meta description (≤320)<textarea className="input-luxe" rows={2} maxLength={320} {...field("description")} /></label>
        <label className="text-xs">Canonical URL<input className="input-luxe" {...field("canonical_url")} /></label>
        <label className="text-xs">Social image URL<input className="input-luxe" {...field("og_image")} /></label>
        <label className="text-xs">Social title<input className="input-luxe" maxLength={120} {...field("og_title")} /></label>
        <label className="text-xs">Social description<input className="input-luxe" maxLength={320} {...field("og_description")} /></label>
        <label className="text-xs flex items-center gap-2"><input type="checkbox" checked={form.noindex} onChange={(e) => setForm({ ...form, noindex: e.target.checked })} /> Hide from search engines (noindex)</label>
        <button className="btn-primary w-fit">Save SEO</button>
      </form>
      {msg && <p className="text-sm mt-2" role="status">{msg}</p>}
      {data.items.length > 0 && (
        <table className="text-xs w-full mt-4"><thead><tr className="text-left"><th>Custom path</th><th>Title</th><th /></tr></thead>
          <tbody>{data.items.map((i) => <tr key={i.path} className="border-t"><td>{i.path}</td><td>{i.title}</td><td className="text-right"><button type="button" className="text-jlt-gold mr-3" onClick={() => edit(i.path)}>Edit</button><button type="button" className="text-red-600" onClick={() => remove(i.path)}>Remove</button></td></tr>)}</tbody></table>
      )}
    </section>
  );
};

export const OfferPricesPanel = () => {
  const [items, setItems] = useState([]);
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => { http.get("/admin/offer-prices").then(r => setItems(r.data.items)).catch(() => setMsg("Unable to load offer prices. Reload to retry.")); }, []);
  const save = async e => {
    e.preventDefault(); setSaving(true); setMsg("");
    try {
      const prices = Object.fromEntries(items.map(i => [i.slug, Number(i.price)]));
      const r = await http.put("/admin/offer-prices", { prices });
      setItems(r.data.items); setMsg("Prices saved. Storefront and checkout use these prices immediately.");
    } catch (err) { setMsg(errText(err, "Unable to save prices.")); }
    finally { setSaving(false); }
  };
  return <section className="bg-white border border-jlt-black/10 p-5 mb-6" data-testid="admin-offer-prices">
    <h2 className="font-display text-2xl">Bundles & Discovery Sets</h2>
    <form onSubmit={save} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
      {items.map((item, index) => <label key={item.slug} className="text-xs">{item.title} (₹)
        <input className="input-luxe" type="number" required min="1" max="1000000" step="1" value={item.price}
          onChange={e => setItems(items.map((v, n) => n === index ? { ...v, price: e.target.value } : v))} />
      </label>)}
      <button disabled={saving || !items.length} className="btn-primary w-fit">{saving ? "Saving…" : "Save offer prices"}</button>
    </form>{msg && <p role="status" className="text-sm mt-3">{msg}</p>}
  </section>;
};
