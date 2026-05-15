import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Heart, ShoppingBag, MessageCircle, Truck, Shield, RotateCcw, Star } from "lucide-react";
import http, { waLink } from "../lib/api";
import { useCart, useWish } from "../lib/store";
import { ProductGrid } from "../components/ProductCard";

const ProductDetail = () => {
  const { slug } = useParams();
  const [data, setData] = useState(null);
  const [size, setSize] = useState("20ml");
  const [reviews, setReviews] = useState([]);
  const [reviewForm, setReviewForm] = useState({ name: "", rating: 5, title: "", comment: "" });
  const { addToCart } = useCart();
  const { inWish, toggleWish } = useWish();

  useEffect(() => {
    http.get(`/products/${slug}`).then((r) => setData(r.data));
    http.get(`/reviews/${slug}`).then((r) => setReviews(r.data.items));
  }, [slug]);

  if (!data) return <div className="max-w-7xl mx-auto px-6 py-20 text-center">Loading…</div>;
  const p = data.product;
  const sz = p.sizes.find((s) => s.size === size) || p.sizes[0];

  const submitReview = async (e) => {
    e.preventDefault();
    const r = await http.post(`/reviews/${slug}`, reviewForm);
    setReviews([r.data.review, ...reviews]);
    setReviewForm({ name: "", rating: 5, title: "", comment: "" });
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-10" data-testid="product-detail">
      <Link to="/shop" className="text-xs tracking-[0.2em] uppercase text-jlt-black/60">← Back to Shop</Link>

      <div className="grid md:grid-cols-2 gap-10 mt-6">
        {/* Image */}
        <div className="bottle-card aspect-[4/5] flex items-end justify-center p-10">
          <div className="bottle-silhouette w-2/3 h-4/5">
            <div className="absolute inset-x-4 top-[14%] text-center text-jlt-ivory">
              <div className="text-[0.6rem] tracking-[0.3em] uppercase text-jlt-gold">JLT</div>
              <div className="font-display text-base mt-2 leading-tight">{p.name}</div>
              <div className="text-[0.55rem] tracking-[0.25em] mt-2 text-jlt-ivory/70">Inspired Edition</div>
            </div>
          </div>
        </div>

        {/* Info */}
        <div>
          <div className="text-[0.7rem] tracking-[0.3em] uppercase text-jlt-gold">Inspired by {p.brand_inspiration}</div>
          <h1 className="font-display text-4xl mt-2" data-testid="product-name">{p.name}</h1>
          <div className="flex items-center gap-3 mt-2 text-sm">
            <div className="flex items-center gap-1"><Star size={14} fill="currentColor" className="text-jlt-gold" /> {p.rating} <span className="text-jlt-black/50">({p.review_count} reviews)</span></div>
            <span className="text-jlt-black/30">•</span>
            <span>{p.gender}</span>
          </div>

          <div className="mt-5 text-[0.7rem] text-jlt-black/60 bg-jlt-bone p-3 rounded">
            JLT Fragrances is not affiliated with, endorsed by, or sponsored by {p.brand_inspiration}. Names are used only to describe scent inspiration.
          </div>

          <div className="mt-6">
            <div className="text-[0.7rem] tracking-[0.2em] uppercase text-jlt-black/60 mb-2">Size</div>
            <div className="flex gap-2">
              {p.sizes.map((s) => (
                <button key={s.size} onClick={() => setSize(s.size)} data-testid={`size-${s.size}`}
                  className={`chip ${size === s.size ? "chip-active" : ""}`}>
                  {s.size} · ₹{s.price}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 text-3xl font-display" data-testid="product-price">₹{sz.price}</div>

          <div className="mt-6 flex flex-wrap gap-2">
            <button onClick={() => addToCart(p, size)} className="btn-primary" data-testid="add-to-cart"><ShoppingBag size={14}/> Add to Cart</button>
            <Link to="/checkout" onClick={() => addToCart(p, size)} className="btn-outline" data-testid="buy-now">Buy Now</Link>
            <button onClick={() => toggleWish(p)} className="btn-outline" data-testid="wishlist-btn"><Heart size={14} fill={inWish(p.slug) ? "currentColor" : "none"} /> {inWish(p.slug) ? "Wishlisted" : "Wishlist"}</button>
          </div>
          <a href={waLink(`Hi! I'd like a recommendation similar to ${p.name} (Inspired by ${p.brand_inspiration}).`)} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 text-sm text-[#25D366] hover:underline" data-testid="wa-recommend"><MessageCircle size={16}/> Ask for a recommendation on WhatsApp</a>

          {/* What it smells like */}
          <div className="mt-8 border-t border-jlt-black/10 pt-6">
            <h3 className="text-[0.7rem] tracking-[0.3em] uppercase text-jlt-gold mb-2">What it smells like</h3>
            <p className="text-sm text-jlt-black/80 leading-relaxed">{p.smells_like}</p>
          </div>

          {/* Notes pyramid */}
          <div className="mt-6 grid grid-cols-3 gap-4 border-t border-jlt-black/10 pt-6">
            {[["Top", p.notes.top], ["Heart", p.notes.heart], ["Base", p.notes.base]].map(([t, arr]) => (
              <div key={t}>
                <div className="text-[0.65rem] tracking-[0.2em] uppercase text-jlt-gold">{t} Notes</div>
                <div className="text-sm mt-2">{arr.join(", ")}</div>
              </div>
            ))}
          </div>

          {/* Attributes grid */}
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-4 border-t border-jlt-black/10 pt-6 text-sm">
            <div><div className="text-[0.65rem] tracking-[0.2em] uppercase text-jlt-black/50">Longevity</div>{p.longevity}</div>
            <div><div className="text-[0.65rem] tracking-[0.2em] uppercase text-jlt-black/50">Projection</div>{p.projection}</div>
            <div><div className="text-[0.65rem] tracking-[0.2em] uppercase text-jlt-black/50">Scent Family</div>{p.scent_family.join(", ")}</div>
            <div><div className="text-[0.65rem] tracking-[0.2em] uppercase text-jlt-black/50">Gender</div>{p.gender}</div>
            <div><div className="text-[0.65rem] tracking-[0.2em] uppercase text-jlt-black/50">Season</div>{p.seasons.join(", ")}</div>
            <div><div className="text-[0.65rem] tracking-[0.2em] uppercase text-jlt-black/50">Occasion</div>{p.occasions.join(", ")}</div>
          </div>

          <div className="mt-6 border-t border-jlt-black/10 pt-6">
            <h3 className="text-[0.7rem] tracking-[0.3em] uppercase text-jlt-gold mb-2">Best for</h3>
            <p className="text-sm">{p.best_for}</p>
            <h3 className="text-[0.7rem] tracking-[0.3em] uppercase text-jlt-gold mt-4 mb-2">Who should buy this</h3>
            <p className="text-sm">{p.who_should_buy}</p>
          </div>

          {/* Reassurance */}
          <div className="mt-8 grid grid-cols-3 gap-3 text-xs">
            <div className="flex items-start gap-2"><Truck size={16} className="text-jlt-gold mt-0.5"/> <div>Pan India delivery in 3–7 days</div></div>
            <div className="flex items-start gap-2"><Shield size={16} className="text-jlt-gold mt-0.5"/> <div>Secure payments & support</div></div>
            <div className="flex items-start gap-2"><RotateCcw size={16} className="text-jlt-gold mt-0.5"/> <div>Damaged/wrong item? Easy claim</div></div>
          </div>
        </div>
      </div>

      {/* Reviews */}
      <section className="mt-16">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <div className="text-[0.7rem] tracking-[0.3em] uppercase text-jlt-gold">Reviews</div>
            <h2 className="font-display text-3xl mt-2">What customers say</h2>
          </div>
        </div>
        <form onSubmit={submitReview} className="mt-6 bg-white border border-jlt-black/10 p-5 grid sm:grid-cols-2 gap-3" data-testid="review-form">
          <input className="input-luxe" placeholder="Your name" required value={reviewForm.name} onChange={(e) => setReviewForm({ ...reviewForm, name: e.target.value })} data-testid="review-name" />
          <select className="input-luxe" value={reviewForm.rating} onChange={(e) => setReviewForm({ ...reviewForm, rating: Number(e.target.value) })} data-testid="review-rating">
            {[5,4,3,2,1].map((r) => <option key={r} value={r}>{r} stars</option>)}
          </select>
          <input className="input-luxe sm:col-span-2" placeholder="Title (optional)" value={reviewForm.title} onChange={(e) => setReviewForm({ ...reviewForm, title: e.target.value })} />
          <textarea className="input-luxe sm:col-span-2" rows={3} placeholder="Share your experience" required value={reviewForm.comment} onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })} data-testid="review-comment" />
          <button className="btn-primary sm:col-span-2 justify-center" data-testid="submit-review">Submit Review</button>
        </form>
        <div className="mt-6 space-y-4">
          {reviews.length === 0 && <div className="text-sm text-jlt-black/60">No reviews yet. Be the first.</div>}
          {reviews.map((r) => (
            <div key={r.id} className="bg-white border border-jlt-black/10 p-4">
              <div className="flex gap-0.5 text-jlt-gold">{Array.from({ length: r.rating }).map((_, i) => <Star key={i} size={12} fill="currentColor"/>)}</div>
              {r.title && <div className="font-display text-lg mt-1">{r.title}</div>}
              <p className="text-sm mt-1">{r.comment}</p>
              <div className="text-[0.7rem] tracking-[0.18em] uppercase text-jlt-black/50 mt-2">— {r.name}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Related */}
      {data.related.length > 0 && (
        <section className="mt-16">
          <div className="text-[0.7rem] tracking-[0.3em] uppercase text-jlt-gold">You may also love</div>
          <h2 className="font-display text-3xl mt-2 mb-8">Related fragrances</h2>
          <ProductGrid items={data.related} />
        </section>
      )}
    </div>
  );
};
export default ProductDetail;
