import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Minus, Plus, Trash2, ShoppingBag, Heart } from "lucide-react";
import { useCart, useWish } from "../lib/store";

export const Cart = () => {
  const { cart, removeFromCart, updateQty, cartTotal, clearCart } = useCart();
  const nav = useNavigate();
  if (cart.length === 0) return (
    <div className="max-w-3xl mx-auto px-6 py-20 text-center" data-testid="cart-empty">
      <ShoppingBag size={40} className="mx-auto text-jlt-gold" />
      <h1 className="font-display text-4xl mt-4">Your cart is empty</h1>
      <p className="text-sm text-jlt-black/60 mt-2">Discover our 750+ premium-inspired scents.</p>
      <Link to="/shop" className="btn-primary mt-6 inline-flex">Shop Fragrances</Link>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto px-6 py-12" data-testid="cart-page">
      <h1 className="font-display text-4xl">Your Cart</h1>
      <div className="grid md:grid-cols-[1fr_360px] gap-8 mt-8">
        <div className="space-y-3">
          {cart.map((i) => (
            <div key={i.key} className="bg-white border border-jlt-black/10 p-4 flex gap-4 items-center" data-testid={`cart-item-${i.slug}`}>
              <div className="bottle-card w-20 h-24 shrink-0 flex items-end justify-center p-2"><div className="bottle-silhouette w-3/4 h-4/5"/></div>
              <div className="flex-1">
                <div className="text-[0.65rem] tracking-[0.25em] uppercase text-jlt-gold">Inspired by {i.brand}</div>
                <Link to={`/product/${i.slug}`} className="font-display text-lg">{i.name}</Link>
                <div className="text-xs text-jlt-black/60">{i.size} · ₹{i.price}</div>
                <div className="flex items-center gap-2 mt-2">
                  <button onClick={() => updateQty(i.key, i.qty - 1)} className="w-7 h-7 border border-jlt-black/20 flex items-center justify-center" data-testid={`qty-dec-${i.slug}`}><Minus size={14}/></button>
                  <span className="w-8 text-center" data-testid={`qty-${i.slug}`}>{i.qty}</span>
                  <button onClick={() => updateQty(i.key, i.qty + 1)} className="w-7 h-7 border border-jlt-black/20 flex items-center justify-center" data-testid={`qty-inc-${i.slug}`}><Plus size={14}/></button>
                </div>
              </div>
              <div className="text-right">
                <div className="font-display text-lg">₹{i.price * i.qty}</div>
                <button onClick={() => removeFromCart(i.key)} className="text-xs text-jlt-black/50 mt-2 inline-flex items-center gap-1" data-testid={`remove-${i.slug}`}><Trash2 size={12}/> Remove</button>
              </div>
            </div>
          ))}
        </div>
        <aside className="bg-white border border-jlt-black/10 p-6 h-fit" data-testid="cart-summary">
          <div className="text-[0.7rem] tracking-[0.3em] uppercase text-jlt-gold">Order Summary</div>
          <div className="flex justify-between mt-4 text-sm"><span>Subtotal</span><span>₹{cartTotal}</span></div>
          <div className="flex justify-between text-sm"><span>Shipping</span><span>{cartTotal >= 999 ? "FREE" : "₹49"}</span></div>
          <div className="border-t border-jlt-black/10 mt-4 pt-4 flex justify-between font-display text-xl"><span>Total</span><span>₹{cartTotal >= 999 ? cartTotal : cartTotal + 49}</span></div>
          <button onClick={() => nav("/checkout")} className="btn-primary w-full justify-center mt-5" data-testid="checkout-btn">Checkout</button>
          <button onClick={clearCart} className="text-xs text-jlt-black/50 mt-3 w-full text-center" data-testid="clear-cart">Clear cart</button>
        </aside>
      </div>
    </div>
  );
};

export const Wishlist = () => {
  const { wish, toggleWish } = useWish();
  if (wish.length === 0) return (
    <div className="max-w-3xl mx-auto px-6 py-20 text-center" data-testid="wishlist-empty">
      <Heart size={40} className="mx-auto text-jlt-gold"/>
      <h1 className="font-display text-4xl mt-4">Your wishlist is empty</h1>
      <Link to="/shop" className="btn-primary mt-6 inline-flex">Browse Fragrances</Link>
    </div>
  );
  return (
    <div className="max-w-6xl mx-auto px-6 py-12" data-testid="wishlist-page">
      <h1 className="font-display text-4xl mb-8">Your Wishlist</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {wish.map((p) => (
          <div key={p.slug} className="bg-white border border-jlt-black/10 p-4">
            <Link to={`/product/${p.slug}`}>
              <div className="bottle-card aspect-[4/5] flex items-end justify-center p-3"><div className="bottle-silhouette w-2/3 h-4/5"/></div>
              <div className="text-[0.65rem] tracking-[0.25em] uppercase text-jlt-gold mt-3">Inspired by {p.brand}</div>
              <div className="font-display text-lg">{p.name}</div>
              <div className="text-sm text-jlt-black/60 mt-1">From ₹{p.base_price}</div>
            </Link>
            <button onClick={() => toggleWish(p)} className="text-xs text-jlt-black/50 mt-3 inline-flex items-center gap-1"><Trash2 size={12}/> Remove</button>
          </div>
        ))}
      </div>
    </div>
  );
};

export const Checkout = () => {
  const { cart, cartTotal, clearCart } = useCart();
  const [form, setForm] = React.useState({ name: "", email: "", phone: "", address: "", city: "", state: "", pin: "", method: "cod" });
  const [placed, setPlaced] = React.useState(false);
  const submit = (e) => { e.preventDefault(); setPlaced(true); clearCart(); };
  if (placed) return (
    <div className="max-w-2xl mx-auto px-6 py-20 text-center" data-testid="order-placed">
      <h1 className="font-display text-4xl">Thank you for your order!</h1>
      <div className="divider-gold"/>
      <p className="mt-4 text-jlt-black/70">This is a checkout-ready layout — payments will be enabled soon. Our team will reach out via WhatsApp to confirm your order.</p>
      <Link to="/shop" className="btn-primary mt-8 inline-flex">Continue Shopping</Link>
    </div>
  );
  if (cart.length === 0) return <div className="max-w-3xl mx-auto px-6 py-20 text-center" data-testid="checkout-empty"><p>Your cart is empty.</p><Link to="/shop" className="btn-primary mt-4 inline-flex">Shop</Link></div>;
  const total = cartTotal >= 999 ? cartTotal : cartTotal + 49;
  return (
    <div className="max-w-6xl mx-auto px-6 py-12" data-testid="checkout-page">
      <h1 className="font-display text-4xl mb-8">Checkout</h1>
      <form onSubmit={submit} className="grid md:grid-cols-[1fr_360px] gap-8">
        <div className="bg-white border border-jlt-black/10 p-6 space-y-3">
          <div className="text-[0.7rem] tracking-[0.3em] uppercase text-jlt-gold mb-2">Shipping Details</div>
          <input className="input-luxe" placeholder="Full Name" required value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})}/>
          <div className="grid grid-cols-2 gap-3"><input className="input-luxe" type="email" placeholder="Email" required value={form.email} onChange={(e)=>setForm({...form,email:e.target.value})}/><input className="input-luxe" placeholder="Phone" required value={form.phone} onChange={(e)=>setForm({...form,phone:e.target.value})}/></div>
          <textarea className="input-luxe" rows={2} placeholder="Address" required value={form.address} onChange={(e)=>setForm({...form,address:e.target.value})}/>
          <div className="grid grid-cols-3 gap-3"><input className="input-luxe" placeholder="City" required value={form.city} onChange={(e)=>setForm({...form,city:e.target.value})}/><input className="input-luxe" placeholder="State" required value={form.state} onChange={(e)=>setForm({...form,state:e.target.value})}/><input className="input-luxe" placeholder="PIN" required value={form.pin} onChange={(e)=>setForm({...form,pin:e.target.value})}/></div>
          <div className="text-[0.7rem] tracking-[0.3em] uppercase text-jlt-gold mt-4">Payment Method</div>
          <div className="flex flex-col gap-2 text-sm">
            <label className="flex items-center gap-2 border border-jlt-black/15 p-3"><input type="radio" name="m" checked={form.method==="cod"} onChange={()=>setForm({...form,method:"cod"})}/> Cash on Delivery</label>
            <label className="flex items-center gap-2 border border-jlt-black/15 p-3 opacity-60"><input type="radio" name="m" disabled/> Online Payment (Coming Soon)</label>
          </div>
        </div>
        <aside className="bg-white border border-jlt-black/10 p-6 h-fit">
          <div className="text-[0.7rem] tracking-[0.3em] uppercase text-jlt-gold">Order Summary</div>
          {cart.map((i) => (<div key={i.key} className="flex justify-between text-sm py-1.5"><span>{i.name} {i.size} ×{i.qty}</span><span>₹{i.price*i.qty}</span></div>))}
          <div className="border-t border-jlt-black/10 mt-3 pt-3 flex justify-between font-display text-xl"><span>Total</span><span>₹{total}</span></div>
          <button className="btn-primary w-full justify-center mt-5" data-testid="place-order">Place Order</button>
          <p className="text-[0.65rem] text-jlt-black/50 mt-3">By placing this order you agree to our Terms & Conditions and Privacy Policy.</p>
        </aside>
      </form>
    </div>
  );
};
