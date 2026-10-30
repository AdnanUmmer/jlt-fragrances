import React, { createContext, useContext, useEffect, useState } from "react";

import http from "./api";

const CartCtx = createContext();
const WishCtx = createContext();

export const StoreProvider = ({ children }) => {
  const [cart, setCart] = useState(() => JSON.parse(localStorage.getItem("jlt_cart") || "[]"));
  const [wish, setWish] = useState(() => JSON.parse(localStorage.getItem("jlt_wish") || "[]"));

  const [quote, setQuote] = useState(null);
  const [pricingError, setPricingError] = useState("");
  const cartSignature = JSON.stringify(cart.map(({ slug, size, qty, selections }) => ({ slug, size, qty, selections: selections || [] })));
  useEffect(() => {
    const controller = new AbortController();
    const items = JSON.parse(cartSignature);
    if (!items.length) { setQuote(null); setPricingError(""); return () => controller.abort(); }
    const refresh = () => {
      setPricingError("");
      http.post("/cart/quote", { items }, { signal: controller.signal }).then(({ data }) => {
        setQuote({ ...data, signature: cartSignature });
        setCart(current => current.map((item, index) => ({ ...item, ...data.items[index] })));
      }).catch(e => { if (e.code !== "ERR_CANCELED") { setQuote(null); setPricingError(typeof e.response?.data?.detail === "string" ? e.response.data.detail : "Unable to verify current prices. Please retry."); } });
    };
    refresh();
    window.addEventListener("focus", refresh);
    const timer = setInterval(refresh, 15000);
    return () => { controller.abort(); clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, [cartSignature]);
  const pricingReady = !cart.length || (quote?.signature === cartSignature && !pricingError);
  const cartShipping = quote?.signature === cartSignature ? quote.shipping_amount / 100 : 0;

  useEffect(() => localStorage.setItem("jlt_cart", JSON.stringify(cart)), [cart]);
  useEffect(() => localStorage.setItem("jlt_wish", JSON.stringify(wish)), [wish]);

  const addToCart = (product, size, qty = 1) => {
    const sizeObj = product.sizes.find((s) => s.size === size) || product.sizes[0];
    const key = `${product.slug}__${sizeObj.size}${product.selections?.length ? "__" + product.selections.join("|") : ""}`;
    setCart((c) => {
      const idx = c.findIndex((i) => i.key === key);
      if (idx >= 0) {
        const copy = [...c];
        copy[idx] = { ...copy[idx], qty: Math.min(20, copy[idx].qty + qty) };
        return copy;
      }
      return [...c, {
        key, slug: product.slug, name: product.name, brand: product.brand_inspiration,
        selections: product.selections || [], selected_products: product.selected_products || [],
        size: sizeObj.size, price: sizeObj.price, qty, image_url: product.image_url,
      }];
    });
  };
  const removeFromCart = (key) => setCart((c) => c.filter((i) => i.key !== key));
  const updateQty = (key, qty) =>
    setCart((c) => c.map((i) => (i.key === key ? { ...i, qty: Math.min(20, Math.max(1, qty)) } : i)));
  const clearCart = () => setCart([]);

  const toggleWish = (product) =>
    setWish((w) => {
      if (w.find((i) => i.slug === product.slug)) return w.filter((i) => i.slug !== product.slug);
      return [...w, { slug: product.slug, name: product.name, brand: product.brand_inspiration, image_url: product.image_url, base_price: product.base_price }];
    });
  const inWish = (slug) => !!wish.find((i) => i.slug === slug);

  const cartTotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  return (
    <CartCtx.Provider value={{ cart, addToCart, removeFromCart, updateQty, clearCart, cartTotal, cartCount, pricingReady, pricingError, cartShipping }}>
      <WishCtx.Provider value={{ wish, toggleWish, inWish }}>{children}</WishCtx.Provider>
    </CartCtx.Provider>
  );
};

export const useCart = () => useContext(CartCtx);
export const useWish = () => useContext(WishCtx);
