import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import http, { waLink } from "../lib/api";
import { MessageCircle } from "lucide-react";

const DiscoverySets = () => {
  const [sets, setSets] = useState([]);
  useEffect(() => { http.get("/discovery-sets").then((r) => setSets(r.data.items)); }, []);

  return (
    <div className="max-w-7xl mx-auto px-6 py-12" data-testid="discovery-page">
      <div className="text-center mb-12">
        <div className="text-[0.7rem] tracking-[0.3em] uppercase text-jlt-gold">Discovery Sets</div>
        <h1 className="font-display text-5xl mt-2">Try Before You Commit.</h1>
        <p className="text-sm text-jlt-black/70 mt-4 max-w-xl mx-auto">
          Choose a curated discovery set and explore multiple premium-inspired scents before buying a full-size bottle.
        </p>
        <div className="divider-gold" />
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sets.map((s) => (
          <div key={s.slug} className="bottle-card text-jlt-ivory p-8 flex flex-col" data-testid={`set-${s.slug}`}>
            <div className="text-[0.65rem] tracking-[0.3em] uppercase text-jlt-gold">{s.tag}</div>
            <h2 className="font-display text-3xl mt-3 leading-tight">{s.title}</h2>
            <div className="text-xs text-jlt-ivory/60 mt-2">{s.subtitle}</div>
            <p className="text-sm mt-5 text-jlt-ivory/80 flex-1">{s.description}</p>
            <div className="flex items-center justify-between mt-6 pt-6 border-t border-jlt-ivory/10">
              <div className="text-xl text-jlt-gold">₹{s.price}</div>
              <a href={waLink(`Hi! I'd like to order the ${s.title}.`)} target="_blank" rel="noreferrer" className="btn-primary !bg-jlt-gold !border-jlt-gold hover:!bg-jlt-ivory hover:!text-jlt-black"><MessageCircle size={14}/> Order on WhatsApp</a>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12 text-center text-sm text-jlt-black/60">
        Want a custom discovery set? <a href={waLink("Hi! I'd like a custom discovery set.")} target="_blank" rel="noreferrer" className="text-jlt-gold underline">Message us on WhatsApp</a>
      </div>
    </div>
  );
};
export default DiscoverySets;
