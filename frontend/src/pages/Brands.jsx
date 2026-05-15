import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import http from "../lib/api";
import { Sparkles, ChevronRight } from "lucide-react";

const Brands = () => {
  const [groups, setGroups] = useState([]);
  const [total, setTotal] = useState(0);
  const [showNicheOnly, setShowNicheOnly] = useState(false);

  useEffect(() => {
    http.get("/brands").then((r) => { setGroups(r.data.groups); setTotal(r.data.total); });
  }, []);

  const filtered = showNicheOnly
    ? groups.map((g) => ({ ...g, brands: g.brands.filter((b) => b.is_niche) })).filter((g) => g.brands.length)
    : groups;

  const letters = filtered.map((g) => g.letter);

  return (
    <div className="max-w-7xl mx-auto px-6 py-12" data-testid="brands-page">
      <div className="text-center mb-10">
        <div className="text-[0.7rem] tracking-[0.3em] uppercase text-jlt-gold">Brand Directory</div>
        <h1 className="font-display text-5xl mt-2">Shop by Brand Inspiration</h1>
        <p className="text-sm text-jlt-black/60 mt-3 max-w-xl mx-auto">Browse our complete collection of {total} luxury-inspired brands, alphabetically.</p>
        <div className="divider-gold" />
        <div className="flex justify-center gap-3 mt-6">
          <button onClick={() => setShowNicheOnly(false)} className={`chip ${!showNicheOnly ? "chip-active" : ""}`} data-testid="brands-show-all">All Brands</button>
          <button onClick={() => setShowNicheOnly(true)} className={`chip ${showNicheOnly ? "chip-active" : ""}`} data-testid="brands-show-niche"><Sparkles size={14} className="text-jlt-gold mr-1"/> Niche Brands Only</button>
        </div>
      </div>

      {/* Alphabet jump nav */}
      <div className="sticky top-[68px] z-20 bg-jlt-ivory/95 backdrop-blur border-y border-jlt-black/10 py-3 -mx-6 px-6 mb-8">
        <div className="scroll-x flex gap-2 max-w-7xl mx-auto">
          {letters.map((l) => (
            <a key={l} href={`#letter-${l}`} className="chip text-xs shrink-0" data-testid={`brand-jump-${l}`}>{l}</a>
          ))}
        </div>
      </div>

      <div className="space-y-12">
        {filtered.map((g) => (
          <section key={g.letter} id={`letter-${g.letter}`}>
            <h2 className="font-display text-4xl text-jlt-gold border-b border-jlt-black/10 pb-2">{g.letter}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mt-6">
              {g.brands.map((b) => (
                <Link
                  key={b.brand}
                  to={`/shop?brand=${encodeURIComponent(b.brand)}`}
                  className="group bg-white border border-jlt-black/10 hover:border-jlt-gold p-4 flex items-center justify-between transition"
                  data-testid={`brand-link-${b.brand}`}
                >
                  <div>
                    <div className="font-display text-base">{b.brand}</div>
                    <div className="text-[0.7rem] text-jlt-black/60 mt-1">
                      {b.count} {b.count === 1 ? "fragrance" : "fragrances"}
                      {b.is_niche && <span className="ml-2 text-jlt-gold">• Niche</span>}
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-jlt-black/40 group-hover:text-jlt-gold transition" />
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
};

export default Brands;
