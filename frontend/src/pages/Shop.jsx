import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { SlidersHorizontal, X } from "lucide-react";
import http from "../lib/api";
import { ProductGrid } from "../components/ProductCard";

const Shop = () => {
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState({ items: [], total: 0 });
  const [filters, setFilters] = useState(null);
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);

  const f = useMemo(() => Object.fromEntries(params.entries()), [params]);

  useEffect(() => { http.get("/products/filters").then((r) => setFilters(r.data)); }, []);

  useEffect(() => {
    const qp = new URLSearchParams({ ...f, page: String(page), limit: "24" });
    http.get(`/products?${qp.toString()}`).then((r) => setData(r.data));
  }, [params, page]);

  const setF = (key, val) => {
    const np = new URLSearchParams(params);
    if (!val || np.get(key) === val) np.delete(key); else np.set(key, val);
    setPage(1);
    setParams(np);
  };

  const clearAll = () => { setParams({}); setPage(1); };

  const FilterGroup = ({ title, name, options }) => (
    <div className="border-b border-jlt-black/10 py-4">
      <div className="text-[0.7rem] tracking-[0.2em] uppercase text-jlt-black/60 mb-3">{title}</div>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button key={o} onClick={() => setF(name, o)} data-testid={`filter-${name}-${o}`}
            className={`chip text-xs ${f[name] === o ? "chip-active" : ""}`}>{o}</button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-6 py-10" data-testid="shop-page">
      <div className="flex items-end justify-between flex-wrap gap-4 mb-6">
        <div>
          <div className="text-[0.7rem] tracking-[0.3em] uppercase text-jlt-gold">Shop All</div>
          <h1 className="font-display text-4xl sm:text-5xl mt-2">Just Like That Collection</h1>
          <p className="text-sm text-jlt-black/60 mt-2">{data.total} luxury-inspired fragrances</p>
        </div>
        <div className="flex gap-2 items-center">
          <button onClick={() => setOpen(!open)} className="btn-outline lg:hidden" data-testid="toggle-filters"><SlidersHorizontal size={14} /> Filters</button>
          <select className="input-luxe !py-2 !w-auto" onChange={(e) => setF("sort", e.target.value)} value={f.sort || "popular"} data-testid="sort-select">
            <option value="popular">Most Popular</option>
            <option value="price_asc">Price: Low → High</option>
            <option value="price_desc">Price: High → Low</option>
            <option value="rating">Highest Rated</option>
            <option value="new">Newest</option>
          </select>
        </div>
      </div>

      <div className="grid lg:grid-cols-[260px_1fr] gap-8">
        <aside className={`${open ? "fixed inset-0 z-40 bg-jlt-ivory p-6 overflow-y-auto" : "hidden"} lg:block lg:static lg:p-0`} data-testid="filters-sidebar">
          {open && <button onClick={() => setOpen(false)} className="lg:hidden mb-4 flex items-center gap-2"><X size={18}/> Close</button>}
          {Object.keys(f).length > 0 && (
            <button onClick={clearAll} className="text-xs tracking-[0.2em] uppercase text-jlt-gold mb-3" data-testid="clear-filters">Clear all filters ×</button>
          )}
          {filters && <>
            <FilterGroup title="Mood" name="mood" options={filters.moods} />
            <FilterGroup title="Scent Family" name="scent" options={filters.scent_families} />
            <FilterGroup title="Occasion" name="occasion" options={filters.occasions} />
            <FilterGroup title="Gender" name="gender" options={filters.genders} />
            <FilterGroup title="Size" name="size" options={filters.sizes} />
            <FilterGroup title="Longevity" name="longevity" options={filters.longevity} />
            <FilterGroup title="Projection" name="projection" options={filters.projection} />
            <div className="border-b border-jlt-black/10 py-4">
              <div className="text-[0.7rem] tracking-[0.2em] uppercase text-jlt-black/60 mb-3">Brand Inspiration</div>
              <select value={f.brand || ""} onChange={(e) => setF("brand", e.target.value)} className="input-luxe !py-2" data-testid="filter-brand">
                <option value="">All brands</option>
                {filters.brands.map((b) => <option key={b}>{b}</option>)}
              </select>
            </div>
            <div className="py-4 flex gap-2 flex-wrap">
              <button onClick={() => setF("bestseller", "true")} className={`chip text-xs ${f.bestseller ? "chip-active" : ""}`} data-testid="filter-bestseller">Bestsellers</button>
              <button onClick={() => setF("new_arrival", "true")} className={`chip text-xs ${f.new_arrival ? "chip-active" : ""}`} data-testid="filter-new">New Arrivals</button>
              <button onClick={() => setF("niche", "true")} className={`chip text-xs ${f.niche === "true" ? "chip-active" : ""}`} data-testid="filter-niche">Niche Brands</button>
            </div>
          </>}
        </aside>

        <div>
          {data.items.length === 0 ? (
            <div className="text-center py-20 text-jlt-black/60">No fragrances match these filters. Try clearing some.</div>
          ) : (
            <>
              <ProductGrid items={data.items} />
              {data.total > 24 && (
                <div className="flex justify-center gap-3 mt-12">
                  <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn-outline disabled:opacity-40">Prev</button>
                  <span className="self-center text-sm">Page {page} / {Math.ceil(data.total / 24)}</span>
                  <button disabled={page * 24 >= data.total} onClick={() => setPage(p => p + 1)} className="btn-outline disabled:opacity-40">Next</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
export default Shop;
