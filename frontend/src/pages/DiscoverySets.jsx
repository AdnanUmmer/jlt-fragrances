import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import http, { waLink } from "../lib/api";
import { MessageCircle, Sparkles } from "lucide-react";

const SetCard = ({ s, dark = true }) => (
  <div className={`${dark ? "bottle-card text-jlt-ivory" : "bg-white border border-jlt-black/10"} p-7 flex flex-col`} data-testid={`set-${s.slug}`}>
    {s.tag && <div className="text-[0.65rem] tracking-[0.3em] uppercase text-jlt-gold">{s.tag}</div>}
    <h3 className={`font-display ${dark ? "text-2xl" : "text-2xl text-jlt-black"} mt-2 leading-tight`}>{s.title}</h3>
    <div className={`text-xs mt-2 ${dark ? "text-jlt-ivory/60" : "text-jlt-black/60"}`}>{s.subtitle}</div>
    <p className={`text-sm mt-4 ${dark ? "text-jlt-ivory/80" : "text-jlt-black/80"} flex-1`}>{s.description}</p>
    <div className={`flex items-center justify-between mt-5 pt-5 border-t ${dark ? "border-jlt-ivory/10" : "border-jlt-black/10"}`}>
      <div className="text-xl text-jlt-gold">₹{s.price}</div>
      <a href={waLink(`Hi! I'd like to order the ${s.title}.`)} target="_blank" rel="noreferrer" className="btn-primary !bg-jlt-gold !border-jlt-gold hover:!bg-jlt-ivory hover:!text-jlt-black"><MessageCircle size={14}/> Order on WhatsApp</a>
    </div>
  </div>
);

const DiscoverySets = () => {
  const [sets, setSets] = useState([]);
  const [combos, setCombos] = useState({ tester_combos: [], special_offers: [] });

  useEffect(() => {
    http.get("/discovery-sets").then((r) => setSets(r.data.items));
    http.get("/combos").then((r) => setCombos(r.data));
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-6 py-12" data-testid="discovery-page">
      <div className="text-center mb-14">
        <div className="text-[0.7rem] tracking-[0.3em] uppercase text-jlt-gold">Discovery & Combos</div>
        <h1 className="font-display text-5xl mt-2">Try Before You Commit.</h1>
        <p className="text-sm text-jlt-black/70 mt-4 max-w-xl mx-auto">
          Choose a curated set, tester combo, or special bundle and explore multiple premium-inspired scents before buying a full-size bottle.
        </p>
        <div className="divider-gold" />
      </div>

      {/* TESTER COMBOS */}
      <section className="mb-16" data-testid="tester-combos-section">
        <div className="flex items-end justify-between gap-4 mb-6 flex-wrap">
          <div>
            <div className="text-[0.7rem] tracking-[0.3em] uppercase text-jlt-gold">Tester Combos</div>
            <h2 className="font-display text-3xl mt-1">Pick Your Own Sampler</h2>
            <p className="text-sm text-jlt-black/60 mt-1">Choose any fragrances at 8ml each — perfect way to try multiple scents.</p>
          </div>
          <a href={waLink("Hi! I'd like to build a tester combo.")} target="_blank" rel="noreferrer" className="btn-outline" data-testid="combo-wa-help"><MessageCircle size={14}/> Need help choosing?</a>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {combos.tester_combos.map((s) => <SetCard key={s.slug} s={s} dark={true} />)}
        </div>
      </section>

      {/* SPECIAL OFFERS */}
      <section className="mb-16 bg-jlt-bone p-8 sm:p-10 -mx-6" data-testid="special-offers-section">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8">
            <div className="text-[0.7rem] tracking-[0.3em] uppercase text-jlt-gold flex items-center justify-center gap-2"><Sparkles size={14}/> Special Offers <Sparkles size={14}/></div>
            <h2 className="font-display text-4xl mt-1">Bundle & Save</h2>
            <p className="text-sm text-jlt-black/60 mt-2">Pick your favourites at bundle prices.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {combos.special_offers.map((s) => <SetCard key={s.slug} s={s} dark={false} />)}
          </div>
        </div>
      </section>

      {/* CURATED DISCOVERY SETS */}
      <section data-testid="curated-sets-section">
        <div className="text-center mb-8">
          <div className="text-[0.7rem] tracking-[0.3em] uppercase text-jlt-gold">Curated Discovery Sets</div>
          <h2 className="font-display text-4xl mt-1">Hand-picked for you</h2>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {sets.map((s) => <SetCard key={s.slug} s={s} dark={true} />)}
        </div>
      </section>

      <div className="mt-14 text-center text-sm text-jlt-black/60">
        Not sure what to pick? <a href={waLink("Hi! Help me choose a discovery set.")} target="_blank" rel="noreferrer" className="text-jlt-gold underline">Message us on WhatsApp</a> — we'll guide you personally.
      </div>
    </div>
  );
};
export default DiscoverySets;
