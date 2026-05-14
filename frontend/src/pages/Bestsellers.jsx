import React, { useEffect, useState } from "react";
import http from "../lib/api";
import { ProductGrid } from "../components/ProductCard";

const Bestsellers = () => {
  const [items, setItems] = useState([]);
  useEffect(() => { http.get("/products?bestseller=true&limit=48").then((r) => setItems(r.data.items)); }, []);
  return (
    <div className="max-w-7xl mx-auto px-6 py-12" data-testid="bestsellers-page">
      <div className="text-center mb-10">
        <div className="text-[0.7rem] tracking-[0.3em] uppercase text-jlt-gold">Bestsellers</div>
        <h1 className="font-display text-5xl mt-2">The Most-Loved Scents</h1>
        <p className="text-sm text-jlt-black/60 mt-3 max-w-xl mx-auto">Our top-performing fragrances by reviews, repeat purchases, and customer love.</p>
        <div className="divider-gold" />
      </div>
      <ProductGrid items={items} />
    </div>
  );
};
export default Bestsellers;
