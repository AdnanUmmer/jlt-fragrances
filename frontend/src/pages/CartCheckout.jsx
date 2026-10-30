import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Minus, Plus, Trash2, ShoppingBag, Heart } from "lucide-react";
import { useCart, useWish } from "../lib/store";
import http from "../lib/api";
import { loadPaymentCheckout } from "../lib/payment";


const PIN_RE = /^[1-9][0-9]{5}$/;
const PHONE_RE = /^[6-9][0-9]{9}$/;
const newRequestId = () => (window.crypto?.randomUUID ? window.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);

export const Cart = () => {
  const { cart, removeFromCart, updateQty, cartTotal, clearCart, pricingReady, pricingError, cartShipping } = useCart();
  const shippingFee = cartShipping;
  const nav = useNavigate();
  if (cart.length === 0) return (
    <div className="max-w-3xl mx-auto px-6 py-20 text-center" data-testid="cart-empty">
      <ShoppingBag size={40} className="mx-auto text-jlt-gold" />
      <h1 className="font-display text-4xl mt-4">Your cart is empty</h1>
      <p className="text-sm text-jlt-black/60 mt-2">Discover our 800+ Luxury Inspired Scents.</p>
      <Link to="/shop" className="btn-primary mt-6 inline-flex">Shop Fragrances</Link>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto px-6 py-12" data-testid="cart-page">
      <h1 className="font-display text-4xl">Your Cart</h1>
      {!pricingReady && <p role="status" className="mt-3">{pricingError || "Checking current prices…"}</p>}
      <div className="grid md:grid-cols-[1fr_360px] gap-8 mt-8">
        <div className="space-y-3">
          {cart.map((i) => (
            <div key={i.key} className="bg-white border border-jlt-black/10 p-4 flex gap-4 items-center" data-testid={`cart-item-${i.slug}`}>
              <div className="bottle-card w-20 h-24 shrink-0 flex items-end justify-center p-2"><div className="bottle-silhouette w-3/4 h-4/5"/></div>
              <div className="flex-1">
                <div className="text-[0.65rem] tracking-[0.25em] uppercase text-jlt-gold">Inspired by {i.brand}</div>
                <Link to={i.brand === "JLT Fragrances" ? "/discovery-sets" : `/product/${i.slug}`} className="font-display text-lg">{i.name}</Link>
                <div className="text-xs text-jlt-black/60">{i.size} · ₹{i.price}</div>
                {i.selected_products?.length > 0 && <p className="text-xs mt-1">{i.selected_products.map(p => p.name).join(", ")}</p>}
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
          <div className="flex justify-between text-sm"><span>Shipping</span><span>{shippingFee ? `₹${shippingFee}` : "FREE"}</span></div>
          <div className="border-t border-jlt-black/10 mt-4 pt-4 flex justify-between font-display text-xl"><span>Total</span><span>₹{cartTotal + shippingFee}</span></div>
          <button disabled={!pricingReady} onClick={() => nav("/checkout")} className="btn-primary w-full justify-center mt-5" data-testid="checkout-btn">Checkout</button>
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
  const { cart, cartTotal, clearCart, pricingReady, pricingError, cartShipping } = useCart();
  const nav = useNavigate();
  const requestIdRef = React.useRef(newRequestId());
  const submittingRef = React.useRef(false);
  const [form, setForm] = React.useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    pin: "",
  });
  
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [placed, setPlaced] = React.useState(false);
  const [orderData, setOrderData] = React.useState(null);
  const [paymentId, setPaymentId] = React.useState("");
  const [paidTotal, setPaidTotal] = React.useState(null);

  const submit = async (e) => {
    e.preventDefault();
    if (submittingRef.current || !pricingReady) return;
    const phone = form.phone.replace(/[\s-]/g, "").replace(/^(\+91|91)(?=[6-9]\d{9}$)/, "");
    if (!PHONE_RE.test(phone)) return setError("Please enter a valid 10-digit mobile number.");
    if (!PIN_RE.test(form.pin.trim())) return setError("Please enter a valid 6-digit PIN code.");
    submittingRef.current = true;
    setLoading(true);
    setError("");

    try {
      await loadPaymentCheckout();
      // Step 1: Create order on backend
      const createOrderRes = await http.post("/orders", {
        customer_name: form.name.trim(),
        customer_email: form.email.trim(),
        customer_phone: phone,
        shipping_address: form.address.trim(),
        shipping_city: form.city.trim(),
        shipping_state: form.state.trim(),
        shipping_pin: form.pin.trim(),
        request_id: requestIdRef.current,
        items: cart.map((item) => ({
          slug: item.slug,
          selections: item.selections || [],
          name: item.name,
          brand: item.brand,
          size: item.size,
          price: item.price,
          qty: item.qty,
        })),
        total_amount: 0,
      });

      if (!createOrderRes.data.ok) {
        throw new Error(createOrderRes.data.message || "Failed to create order");
      }

      const orderData = createOrderRes.data;
      if (orderData.payment_status === "paid") {
        setOrderData(orderData);
        setPaidTotal(orderData.total_amount / 100);
        setPlaced(true);
        clearCart();
        return;
      }
      setOrderData(orderData);
      const totalPaise = orderData.total_amount;
      setPaidTotal(totalPaise / 100);

      // Step 2: Open Razorpay checkout
      const options = {
        key: orderData.razorpay_key_id,
        amount: totalPaise,
        currency: "INR",
        name: "JLT Fragrances",
        order_id: orderData.razorpay_order_id,
        description: `Order ${orderData.order_id}`,
        prefill: {
          name: form.name,
          email: form.email,
          contact: form.phone,
        },
        handler: async (response) => {
          // Step 3: Verify payment on backend
          try {
            const verifyRes = await http.post("/orders/verify-payment", {
              razorpay_order_id: response.razorpay_order_id || response.order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });

            if (verifyRes.data.ok) {
              setPaymentId(response.razorpay_payment_id || "");
              setPlaced(true);
              clearCart();
              setLoading(false);
              setError("");
            } else {
              setError("Payment verification failed. Please contact support.");
              submittingRef.current = false;
              setLoading(false);
            }
          } catch (err) {
            setError("We could not confirm your payment. If money was debited, please contact support with your order ID before paying again.");
            submittingRef.current = false;
            setLoading(false);
          }
        },
        modal: {
          ondismiss: () => {
            setError("Payment was cancelled. You have not been charged - you can try again when ready.");
            submittingRef.current = false;
            setLoading(false);
          },
        },
      };

      if (!window.Razorpay) {
        throw new Error("Razorpay script not loaded");
      }

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      setError(err.response?.data?.detail && typeof err.response.data.detail === "string" ? err.response.data.detail : (!err.response && err.message && !err.isAxiosError ? err.message : "We could not start your payment. Please check your details and try again."));
      submittingRef.current = false;
      setLoading(false);
    }
  };

  if (placed && orderData) {
    const displayTotal = paidTotal ?? (orderData.total_amount ? orderData.total_amount / 100 : (cartTotal + cartShipping));
    return (
      <div className="max-w-2xl mx-auto px-6 py-20 text-center" data-testid="order-placed">
        <h1 className="font-display text-4xl">✓ Order Confirmed!</h1>
        <div className="divider-gold" />
        <p className="mt-4 text-jlt-black/70">
          Thank you, <strong>{form.name}</strong>! Your payment of <strong>₹{displayTotal}</strong> has been received.
        </p>
        <div className="bg-jlt-gold/5 border border-jlt-gold/20 p-4 rounded mt-6 text-left text-sm">
          <div className="mb-2"><strong>Order ID:</strong> {orderData.order_id}</div>
          <div className="mb-2"><strong>Payment ID:</strong> {paymentId || "Processing..."}</div>
        </div>
        <p className="mt-4 text-jlt-black/60 text-sm">Our team will process your order shortly.</p>
        <Link to="/shop" className="btn-primary mt-8 inline-flex">Continue Shopping</Link>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-20 text-center" data-testid="checkout-empty">
        <p>Your cart is empty.</p>
        <Link to="/shop" className="btn-primary mt-4 inline-flex">Shop</Link>
      </div>
    );
  }

  const total = cartTotal + cartShipping;

  return (
    <div className="max-w-6xl mx-auto px-6 py-12" data-testid="checkout-page">
      <h1 className="font-display text-4xl mb-8">Checkout</h1>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded mb-6" data-testid="checkout-error">
          {error}
        </div>
      )}

      <form onSubmit={submit} className="grid md:grid-cols-[1fr_360px] gap-8">
        <div className="bg-white border border-jlt-black/10 p-6 space-y-3">
          <div className="text-[0.7rem] tracking-[0.3em] uppercase text-jlt-gold mb-2">Shipping Details</div>
          <input
            className="input-luxe"
            placeholder="Full Name" aria-label="Full name" autoComplete="name"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            disabled={loading || !pricingReady}
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              className="input-luxe"
              type="email"
              placeholder="Email" aria-label="Email" autoComplete="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              disabled={loading || !pricingReady}
            />
            <input
              className="input-luxe"
              placeholder="Mobile number (10 digits)" aria-label="Mobile number" autoComplete="tel" inputMode="tel"
              required
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              disabled={loading || !pricingReady}
            />
          </div>
          <textarea
            className="input-luxe"
            rows={2}
            placeholder="Address" aria-label="Address" autoComplete="street-address"
            required
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            disabled={loading || !pricingReady}
          />
          <div className="grid grid-cols-3 gap-3">
            <input
              className="input-luxe"
              placeholder="City" aria-label="City" autoComplete="address-level2"
              required
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              disabled={loading || !pricingReady}
            />
            <input
              className="input-luxe"
              placeholder="State" aria-label="State" autoComplete="address-level1"
              required
              value={form.state}
              onChange={(e) => setForm({ ...form, state: e.target.value })}
              disabled={loading || !pricingReady}
            />
            <input
              className="input-luxe"
              placeholder="PIN code" aria-label="PIN code" autoComplete="postal-code" inputMode="numeric" maxLength={6}
              required
              value={form.pin}
              onChange={(e) => setForm({ ...form, pin: e.target.value })}
              disabled={loading || !pricingReady}
            />
          </div>
          <div className="text-[0.7rem] tracking-[0.3em] uppercase text-jlt-gold mt-4">Payment Method</div>
          <div className="flex flex-col gap-2 text-sm bg-jlt-gold/5 p-3 rounded">
            <p className="text-jlt-black/70">💳 Razorpay Secure Payment</p>
            <p className="text-[0.8rem] text-jlt-black/60">Click "Place Order" to proceed with secure payment via Razorpay (Cards, UPI, Wallets)</p>
          </div>
        </div>
        
        <aside className="bg-white border border-jlt-black/10 p-6 h-fit">
          <div className="text-[0.7rem] tracking-[0.3em] uppercase text-jlt-gold">Order Summary</div>
          {cart.map((i) => (
            <div key={i.key} className="flex justify-between text-sm py-1.5">
              <span>{i.name} {i.size} ×{i.qty}</span>
              <span>₹{i.price * i.qty}</span>
            </div>
          ))}
          <div className="border-t border-jlt-black/10 mt-3 pt-3">
            <div className="flex justify-between text-sm mb-2">
              <span>Subtotal</span>
              <span>₹{cartTotal}</span>
            </div>
            {total > cartTotal && (
              <div className="flex justify-between text-sm mb-2">
                <span>Shipping</span>
                <span>₹{total - cartTotal}</span>
              </div>
            )}
            <div className="flex justify-between font-display text-xl">
              <span>Total</span>
              <span>₹{total}</span>
            </div>
          </div>
          {!pricingReady && <p role="status">{pricingError || "Checking current prices…"}</p>}
          <button
            className="btn-primary w-full justify-center mt-5 disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="place-order"
            disabled={loading || !pricingReady}
          >
            {loading ? "Processing..." : "Place Order & Pay"}
          </button>
          <p className="text-[0.65rem] text-jlt-black/50 mt-3">By placing this order you agree to our Terms & Conditions and Privacy Policy.</p>
        </aside>
      </form>
    </div>
  );
};
