import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ShieldCheck, Truck, Sparkles, MessageCircle, CreditCard, Star } from "lucide-react";
import http, { waLink, INSTAGRAM_URL } from "../lib/api";
import { ProductGrid } from "../components/ProductCard";

const trustItems = [
  ["750+ Inspired Scents", Sparkles],
  ["Starting ₹499", CreditCard],
  ["Premium Oils", Sparkles],
  ["Pan India Delivery", Truck],
  ["Secure Payments", ShieldCheck],
  ["WhatsApp Support", MessageCircle],
];

const moods = ["Fresh", "Sweet", "Oud", "Floral", "Clean", "Spicy", "Musky"];
const occasions = ["Office", "Date Night", "Wedding", "Daily Wear", "Gifting", "Festive Wear"];

const testimonials = [
  { name: "Aanya M.", city: "Mumbai", text: "Smells exactly like the real one. My friends couldn't tell the difference. Lasted me 8+ hours on a wedding night.", rating: 5 },
  { name: "Rohan K.", city: "Bengaluru", text: "Best value for money. I've bought 4 bottles already. The 30ml at ₹499 is unreal quality.", rating: 5 },
  { name: "Priya S.", city: "Delhi", text: "I wear the oud-inspired blend to work events. Compliments every single time. Highly recommend.", rating: 5 },
  { name: "Kunal T.", city: "Hyderabad", text: "Packaging is premium and the scent quality matches designer fragrances. WhatsApp support was super helpful.", rating: 5 },
];

const Home = () => {
  const [bestsellers, setBestsellers] = useState([]);
  const [sets, setSets] = useState([]);
  useEffect(() => {
    http.get("/products/bestsellers?limit=8").then((r) => setBestsellers(r.data.items));
    http.get("/discovery-sets").then((r) => setSets(r.data.items));
  }, []);

  return (
    <>
      {/* HERO */}
      <section className="hero-grad" data-testid="hero-section">
        <div className="max-w-7xl mx-auto px-6 py-20 md:py-28 grid md:grid-cols-2 gap-10 items-center">
          <div className="fade-in">
            <div className="text-[0.7rem] tracking-[0.32em] uppercase text-jlt-gold">Just Like That — Luxury-Inspired</div>
            <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl mt-4 leading-[0.95]">
              Smell Premium.<br /><span className="shimmer-text">Spend Smart.</span>
            </h1>
            <p className="mt-6 text-base sm:text-lg text-jlt-black/75 max-w-xl">
              Explore 750+ luxury-inspired fragrances crafted with premium oils, starting at ₹499.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link to="/bestsellers" className="btn-primary" data-testid="hero-shop-bestsellers">Shop Bestsellers <ArrowRight size={14} /></Link>
              <Link to="/find-your-scent" className="btn-outline" data-testid="hero-find-scent">Find My Scent</Link>
            </div>
          </div>
          <div className="relative hidden md:block">
            <div className="grid grid-cols-2 gap-4">
              {bestsellers.slice(0, 4).map((p, i) => (
                <Link key={p.slug} to={`/product/${p.slug}`} className={`bottle-card aspect-[3/4] flex items-end justify-center p-4 ${i % 2 ? "translate-y-6" : ""}`}>
                  <div className="bottle-silhouette w-2/3 h-4/5">
                    <div className="absolute inset-x-2 top-[14%] text-center text-jlt-ivory">
                      <div className="text-[0.5rem] tracking-[0.25em] uppercase text-jlt-gold">JLT</div>
                      <div className="font-display text-[0.65rem] leading-tight mt-1 line-clamp-3">{p.name}</div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* TRUST BAR */}
      <section className="border-y border-jlt-black/10 bg-white" data-testid="trust-bar">
        <div className="max-w-7xl mx-auto px-6 py-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-5">
          {trustItems.map(([label, Icon], i) => (
            <div key={i} className="flex items-center gap-3 text-sm">
              <Icon size={18} className="text-jlt-gold shrink-0" />
              <span className="text-jlt-black/80">{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* MOOD */}
      <section className="max-w-7xl mx-auto px-6 py-16" data-testid="shop-by-mood">
        <div className="text-center mb-10">
          <div className="text-[0.7rem] tracking-[0.3em] uppercase text-jlt-gold">Shop by Mood</div>
          <h2 className="font-display text-4xl sm:text-5xl mt-2">How do you want to feel today?</h2>
          <div className="divider-gold" />
        </div>
        <div className="flex flex-wrap gap-3 justify-center">
          {moods.map((m) => (
            <Link key={m} to={`/shop?mood=${encodeURIComponent(m)}`} className="chip" data-testid={`mood-${m}`}>
              {m}
            </Link>
          ))}
        </div>
      </section>

      {/* OCCASIONS */}
      <section className="bg-jlt-bone py-16" data-testid="shop-by-occasion">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-10">
            <div className="text-[0.7rem] tracking-[0.3em] uppercase text-jlt-gold">Shop by Occasion</div>
            <h2 className="font-display text-4xl sm:text-5xl mt-2">Find your moment</h2>
            <div className="divider-gold" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {occasions.map((o) => (
              <Link key={o} to={`/shop?occasion=${encodeURIComponent(o)}`} className="bg-white border border-jlt-black/10 hover:border-jlt-gold p-6 text-center group" data-testid={`occasion-${o}`}>
                <div className="font-display text-xl">{o}</div>
                <div className="text-[0.65rem] tracking-[0.2em] uppercase text-jlt-gold mt-2 opacity-0 group-hover:opacity-100 transition">Explore →</div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* BESTSELLERS */}
      <section className="max-w-7xl mx-auto px-6 py-16" data-testid="bestsellers-section">
        <div className="flex items-end justify-between mb-10 gap-4">
          <div>
            <div className="text-[0.7rem] tracking-[0.3em] uppercase text-jlt-gold">Bestsellers</div>
            <h2 className="font-display text-4xl sm:text-5xl mt-2">Most-loved scents</h2>
          </div>
          <Link to="/bestsellers" className="text-sm tracking-[0.18em] uppercase line-hover hidden sm:inline-flex items-center gap-1">View All <ArrowRight size={14} /></Link>
        </div>
        <ProductGrid items={bestsellers.slice(0, 8)} />
      </section>

      {/* DISCOVERY */}
      <section className="bg-jlt-black text-jlt-ivory py-20" data-testid="discovery-section">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <div className="text-[0.7rem] tracking-[0.3em] uppercase text-jlt-gold">Discovery Sets</div>
            <h2 className="font-display text-4xl sm:text-5xl mt-2">Try Before You Commit.</h2>
            <p className="max-w-xl mx-auto mt-4 text-jlt-ivory/70">Choose a curated discovery set and explore multiple premium-inspired scents before buying a full-size bottle.</p>
          </div>
          <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-5">
            {sets.map((s) => (
              <Link to="/discovery-sets" key={s.slug} className="border border-jlt-ivory/15 hover:border-jlt-gold p-6 group">
                <div className="text-[0.62rem] tracking-[0.25em] uppercase text-jlt-gold">{s.tag}</div>
                <div className="font-display text-xl mt-3 leading-tight">{s.title}</div>
                <div className="text-xs text-jlt-ivory/60 mt-2">{s.subtitle}</div>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-jlt-gold">₹{s.price}</span>
                  <ArrowRight size={14} className="group-hover:translate-x-1 transition" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* REVIEWS */}
      <section className="max-w-7xl mx-auto px-6 py-16" data-testid="reviews-section">
        <div className="text-center mb-12">
          <div className="text-[0.7rem] tracking-[0.3em] uppercase text-jlt-gold">From the Community</div>
          <h2 className="font-display text-4xl sm:text-5xl mt-2">What our customers say</h2>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {testimonials.map((t, i) => (
            <div key={i} className="bg-white border border-jlt-black/10 p-6">
              <div className="flex gap-0.5 text-jlt-gold">{Array.from({ length: t.rating }).map((_, k) => <Star key={k} size={14} fill="currentColor" />)}</div>
              <p className="mt-4 text-sm text-jlt-black/85 leading-relaxed">"{t.text}"</p>
              <div className="mt-4 text-[0.7rem] tracking-[0.2em] uppercase text-jlt-black/60">— {t.name}, {t.city}</div>
            </div>
          ))}
        </div>
      </section>

      {/* INSTAGRAM */}
      <section className="bg-jlt-bone py-16" data-testid="instagram-section">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="text-[0.7rem] tracking-[0.3em] uppercase text-jlt-gold">@jltfragrances</div>
          <h2 className="font-display text-4xl mt-2">Follow our journey on Instagram</h2>
          <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer" className="btn-outline mt-6 inline-flex" data-testid="instagram-cta">Visit Instagram <ArrowRight size={14} /></a>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="bg-jlt-black text-jlt-ivory py-20" data-testid="final-cta">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="font-display text-4xl sm:text-5xl">Not sure what to choose?</h2>
          <p className="mt-4 text-jlt-ivory/70">Take the scent quiz or message us on WhatsApp — we'll guide you to your perfect fragrance.</p>
          <div className="mt-8 flex flex-wrap gap-3 justify-center">
            <Link to="/find-your-scent" className="btn-primary !bg-jlt-gold !border-jlt-gold hover:!bg-jlt-ivory hover:!text-jlt-black">Take The Quiz</Link>
            <a href={waLink()} target="_blank" rel="noreferrer" className="btn-outline !text-jlt-ivory !border-jlt-ivory hover:!bg-jlt-ivory hover:!text-jlt-black">Message on WhatsApp</a>
          </div>
        </div>
      </section>
    </>
  );
};

export default Home;
