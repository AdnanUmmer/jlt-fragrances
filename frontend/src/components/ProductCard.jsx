import React from "react";
import { Link } from "react-router-dom";
import { Heart, Star } from "lucide-react";
import { useWish } from "../lib/store";

const BottleArt = ({ name }) => (
  <div className="product-image-wrap bottle-card w-full">
    <div className="bottle-silhouette">
      <div className="absolute inset-x-3 top-[14%] text-center text-jlt-ivory">
        <div className="text-[0.55rem] tracking-[0.25em] uppercase text-jlt-gold">JLT</div>
        <div className="font-display text-[0.78rem] leading-tight mt-1 px-1 break-words line-clamp-3">{name}</div>
      </div>
    </div>
  </div>
);

export const ProductCard = ({ product }) => {
  const { inWish, toggleWish } = useWish();
  const liked = inWish(product.slug);
  return (
    <div className="group fade-in" data-testid={`product-card-${product.slug}`}>
      <Link to={`/product/${product.slug}`} className="block relative">
        {product.image_url ? (
          <img src={product.image_url} alt={product.name} className="w-full aspect-[4/5] object-cover bg-jlt-bone" />
        ) : (
          <BottleArt name={product.name} />
        )}
        <button
          onClick={(e) => { e.preventDefault(); toggleWish(product); }}
          data-testid={`wish-toggle-${product.slug}`}
          aria-label="Wishlist"
          className="absolute top-3 right-3 bg-white/90 backdrop-blur rounded-full w-9 h-9 flex items-center justify-center hover:bg-jlt-gold hover:text-white"
        >
          <Heart size={16} fill={liked ? "currentColor" : "none"} className={liked ? "text-jlt-gold" : ""} />
        </button>
        {product.is_bestseller && (
          <span className="absolute top-3 left-3 bg-jlt-gold text-white text-[0.62rem] tracking-[0.18em] uppercase px-2 py-1">Bestseller</span>
        )}
        {!product.is_bestseller && product.is_new_arrival && (
          <span className="absolute top-3 left-3 bg-jlt-black text-jlt-ivory text-[0.62rem] tracking-[0.18em] uppercase px-2 py-1">New</span>
        )}
      </Link>
      <div className="mt-3 sm:mt-4">
        <div className="text-[0.65rem] tracking-[0.25em] uppercase text-jlt-gold">Inspired by {product.brand_inspiration}</div>
        <Link to={`/product/${product.slug}`} className="font-display text-lg sm:text-xl mt-1 block leading-snug line-clamp-1">{product.name}</Link>
        <div className="flex items-center gap-2 mt-1 text-xs text-jlt-black/70">
          <div className="flex items-center gap-1"><Star size={12} fill="currentColor" className="text-jlt-gold" /> {product.rating}</div>
          <span className="text-jlt-black/30">•</span>
          <span>{product.scent_family?.slice(0,2).join(" · ")}</span>
        </div>
        <div className="mt-2 text-sm">
          <span className="text-jlt-black/60">From</span> <span className="font-medium">₹{product.base_price}</span>
        </div>
      </div>
    </div>
  );
};

export const ProductGrid = ({ items }) => (
  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-10">
    {items.map((p) => <ProductCard key={p.slug} product={p} />)}
  </div>
);
