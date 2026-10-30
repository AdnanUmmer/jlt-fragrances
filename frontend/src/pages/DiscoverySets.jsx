import React, { useEffect, useState } from "react";
import { useCart } from "../lib/store";
import http, { waLink } from "../lib/api";
import FragrancePicker from "../components/FragrancePicker";
import { MessageCircle, Sparkles } from "lucide-react";

const SetCard = ({ s, dark = true, products }) => {
  const { addToCart } = useCart();
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState([]);
  const [message, setMessage] = useState("");
  const available = products.filter(p => p.in_stock !== false && p.is_active !== false && (s.size === "8ml" || (p.sizes || []).some(v => v.size === s.size && v.in_stock !== false)));
  const complete = Array.from({ length: s.items }, (_, index) => selected[index]).every(slug => available.some(p => p.slug === slug));
  const add = () => {
    if (!selecting) { setMessage(""); setSelecting(true); return; }
    if (!complete) return;
    addToCart({ slug: s.slug, name: s.title, brand_inspiration: "JLT Fragrances", sizes: [{ size: s.size, price: s.price }],
      selections: selected, selected_products: selected.map(slug => { const p = available.find(p => p.slug === slug); return { slug, name: p.name, brand: p.brand_inspiration }; }) }, s.size);
    setMessage("Added to cart"); setSelecting(false); setSelected([]);
  };
  // Separate button themes for dark and light cards.
  const whatsappButtonClass = dark
    ? `
        inline-flex items-center justify-center gap-2
        w-full min-h-[46px] px-4 py-3
        border border-jlt-ivory
        bg-jlt-ivory text-jlt-black
        text-xs sm:text-sm font-semibold uppercase tracking-[0.08em]
        transition-colors duration-200
        hover:bg-jlt-gold hover:border-jlt-gold hover:text-jlt-black
        focus-visible:outline-none focus-visible:ring-2
        focus-visible:ring-jlt-gold focus-visible:ring-offset-2
      `
    : `
        inline-flex items-center justify-center gap-2
        w-full min-h-[46px] px-4 py-3
        border border-jlt-black
        bg-jlt-black text-white
        text-xs sm:text-sm font-semibold uppercase tracking-[0.08em]
        transition-colors duration-200
        hover:bg-jlt-gold hover:border-jlt-gold hover:text-jlt-black
        focus-visible:outline-none focus-visible:ring-2
        focus-visible:ring-jlt-gold focus-visible:ring-offset-2
      `;

  return (
    <article
      className={`${
        dark
          ? "bottle-card text-jlt-ivory"
          : "bg-white border border-jlt-black/10"
      } p-5 sm:p-6 flex flex-col h-full min-w-0 discovery-card`}
      data-testid={`set-${s.slug}`}
    >
      {s.tag && (
        <div className="text-[0.65rem] tracking-[0.3em] uppercase text-jlt-gold">
          {s.tag}
        </div>
      )}

      <h3
        className={`font-display text-2xl mt-2 leading-tight ${
          dark ? "text-jlt-ivory" : "text-jlt-black"
        }`}
      >
        {s.title}
      </h3>

      <div
        className={`text-xs mt-2 ${
          dark ? "text-jlt-ivory/60" : "text-jlt-black/60"
        }`}
      >
        {s.subtitle}
      </div>

      <p
        className={`text-sm mt-4 flex-1 ${
          dark ? "text-jlt-ivory/80" : "text-jlt-black/80"
        }`}
      >
        {s.description}
      </p>

      <div
        className={`flex flex-col gap-3 mt-auto pt-5 border-t ${
          dark ? "border-jlt-ivory/10" : "border-jlt-black/10"
        }`}
      >
        <div className="text-xl text-jlt-gold">
          ₹{s.price}
        </div>

        {selecting && <div className="space-y-4">
          <p className="text-xs opacity-70" role="status">{selected.filter(slug => available.some(p => p.slug === slug)).length} of {s.items} fragrances selected · {s.size} each</p>
          {Array.from({ length: s.items }, (_, index) => <FragrancePicker key={index} label={`Fragrance ${index + 1}`} dark={dark} products={available} value={selected[index] || ""}
            onChange={slug => setSelected(prev => { const next = [...prev]; next[index] = slug; return next; })} />)}
          {!available.length && <p role="status" className="text-sm">No fragrances are available for this size right now.</p>}
          <button type="button" className="text-xs underline underline-offset-4 opacity-70 hover:opacity-100" onClick={() => setSelecting(false)}>Cancel selection</button>
        </div>}
        <button className={`${whatsappButtonClass} disabled:opacity-40 disabled:cursor-not-allowed`} onClick={add} disabled={selecting && !complete}>
          {selecting ? "Add to cart" : "Choose fragrances"}
        </button>
        {message && <p role="status" className="text-sm">{message}</p>}
        <a
          href={waLink(`Hi! I'd like to order the ${s.title}.${selected.filter(Boolean).length ? " My fragrance choices: " + selected.filter(Boolean).map(slug => { const p = available.find(p => p.slug === slug); return p ? `${p.brand_inspiration} — ${p.name}` : slug; }).join(", ") : ""}`)}
          target="_blank"
          rel="noreferrer"
          className={whatsappButtonClass}
          aria-label={`Order ${s.title} on WhatsApp`}
        >
          <MessageCircle size={16} />
          <span>Order on WhatsApp</span>
        </a>
      </div>
    </article>
  );
};

const DiscoverySets = () => {
  const [sets, setSets] = useState([]);
  const [products, setProducts] = useState([]);

  const [combos, setCombos] = useState({
    tester_combos: [],
    special_offers: [],
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    setLoading(true);
    setError("");

    const catalogue = async () => {
      const first = await http.get("/products", { params: { limit: 120, page: 1 }, signal: controller.signal });
      const pages = await Promise.all(Array.from({ length: Math.max(0, Math.ceil(first.data.total / 120) - 1) }, (_, n) => http.get("/products", { params: { limit: 120, page: n + 2 }, signal: controller.signal })));
      return [...first.data.items, ...pages.flatMap(r => r.data.items)];
    };
    Promise.all([
      catalogue(),
      http.get("/discovery-sets", {
        signal: controller.signal,
      }),
      http.get("/combos", {
        signal: controller.signal,
      }),
    ])
      .then(([catalogueItems, setsResponse, combosResponse]) => {
        setProducts(catalogueItems);
        setSets(setsResponse.data.items);
        setCombos(combosResponse.data);
      })
      .catch((error) => {
        if (error.code !== "ERR_CANCELED") {
          setError(
            "We couldn't load the discovery sets. Please try again."
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [retry]);

  useEffect(() => {
    const refresh = () => Promise.all([http.get("/discovery-sets"), http.get("/combos")]).then(([a, b]) => { setSets(a.data.items); setCombos(b.data); }).catch(() => {});
    window.addEventListener("focus", refresh);
    const timer = setInterval(refresh, 15000);
    return () => { window.removeEventListener("focus", refresh); clearInterval(timer); };
  }, []);

  if (loading || error) {
    return (
      <div
        className="max-w-7xl mx-auto p-8"
        role="status"
      >
        {loading ? (
          "Loading discovery sets…"
        ) : (
          <>
            {error}

            <button
              type="button"
              className="btn-outline ml-3"
              onClick={() => setRetry((value) => value + 1)}
            >
              Retry
            </button>
          </>
        )}
      </div>
    );
  }

  return (
    <div
      className="max-w-7xl mx-auto px-6 py-12"
      data-testid="discovery-page"
    >
      {/* PAGE HEADER */}
      <div className="text-center mb-14">
        <div className="text-[0.7rem] tracking-[0.3em] uppercase text-jlt-gold">
          Discovery & Combos
        </div>

        <h1 className="font-display text-5xl mt-2">
          Try Before You Commit.
        </h1>

        <p className="text-sm text-jlt-black/70 mt-4 max-w-xl mx-auto">
          Choose a curated set, tester combo, or special bundle and
          explore multiple premium-inspired scents before buying a
          full-size bottle.
        </p>

        <div className="divider-gold" />
      </div>

      {/* TESTER COMBOS */}
      <section
        className="mb-16"
        data-testid="tester-combos-section"
      >
        <div className="flex items-end justify-between gap-4 mb-6 flex-wrap">
          <div>
            <div className="text-[0.7rem] tracking-[0.3em] uppercase text-jlt-gold">
              Tester Combos
            </div>

            <h2 className="font-display text-3xl mt-1">
              Pick Your Own Sampler
            </h2>

            <p className="text-sm text-jlt-black/60 mt-1">
              Choose any fragrances at 8ml each — perfect way to try
              multiple scents.
            </p>
          </div>

          <a
            href={waLink(
              "Hi! I'd like to build a tester combo."
            )}
            target="_blank"
            rel="noreferrer"
            className="btn-outline"
            data-testid="combo-wa-help"
          >
            <MessageCircle size={14} />
            Need help choosing?
          </a>
        </div>

        <div className="grid md:grid-cols-3 gap-5 items-stretch">
          {combos.tester_combos.map((s) => (
            <SetCard
              key={s.slug}
              s={s}
              products={products}
              dark={true}
            />
          ))}
        </div>
      </section>

      {/* SPECIAL OFFERS */}
      <section
        className="mb-16 bg-jlt-bone p-4 sm:p-8"
        data-testid="special-offers-section"
      >
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8">
            <div className="text-[0.7rem] tracking-[0.3em] uppercase text-jlt-gold flex items-center justify-center gap-2">
              <Sparkles size={14} />
              Special Offers
              <Sparkles size={14} />
            </div>

            <h2 className="font-display text-4xl mt-1">
              Bundle & Save
            </h2>

            <p className="text-sm text-jlt-black/60 mt-2">
              Pick your favourites at bundle prices.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 items-stretch">
            {combos.special_offers.map((s) => (
              <SetCard
                key={s.slug}
                s={s}
                products={products}
                dark={false}
              />
            ))}
          </div>
        </div>
      </section>

      {/* CURATED DISCOVERY SETS */}
      <section data-testid="curated-sets-section">
        <div className="text-center mb-8">
          <div className="text-[0.7rem] tracking-[0.3em] uppercase text-jlt-gold">
            Curated Discovery Sets
          </div>

          <h2 className="font-display text-4xl mt-1">
            Hand-picked for you
          </h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 items-stretch">
          {sets.map((s) => (
            <SetCard
              key={s.slug}
              s={s}
              products={products}
              dark={true}
            />
          ))}
        </div>
      </section>

      {/* HELP */}
      <div className="mt-14 text-center text-sm text-jlt-black/60">
        Not sure what to pick?{" "}
        <a
          href={waLink(
            "Hi! Help me choose a discovery set."
          )}
          target="_blank"
          rel="noreferrer"
          className="text-jlt-gold underline"
        >
          Message us on WhatsApp
        </a>{" "}
        — we'll guide you personally.
      </div>
    </div>
  );
};

export default DiscoverySets;