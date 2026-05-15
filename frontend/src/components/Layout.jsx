import React, { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Search, Heart, ShoppingBag, Menu, X, Instagram } from "lucide-react";
import { useCart, useWish } from "../lib/store";
import { waLink, INSTAGRAM_URL, SUPPORT_EMAIL } from "../lib/api";

const NavLinks = ({ onClick }) => (
  <>
    {[
      ["Shop All", "/shop"],
      ["Bestsellers", "/bestsellers"],
      ["Brands", "/brands"],
      ["Discovery Sets", "/discovery-sets"],
      ["Find Your Scent", "/find-your-scent"],
      ["Just Love That", "/just-love-that"],
      ["About", "/about"],
    ].map(([label, to]) => (
      <NavLink
        key={to}
        to={to}
        onClick={onClick}
        data-testid={`nav-${to.slice(1)}`}
        className={({ isActive }) =>
          `text-[0.82rem] tracking-[0.14em] uppercase line-hover ${isActive ? "text-jlt-gold" : "text-jlt-black"}`
        }
      >
        {label}
      </NavLink>
    ))}
  </>
);

export const Navbar = () => {
  const { cartCount } = useCart();
  const { wish } = useWish();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);

  const submit = (e) => {
    e.preventDefault();
    if (q.trim()) {
      nav(`/shop?q=${encodeURIComponent(q.trim())}`);
      setSearchOpen(false);
      setOpen(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-jlt-ivory/95 backdrop-blur border-b border-jlt-black/10" data-testid="navbar">
      <div className="bg-jlt-black text-jlt-ivory text-[0.7rem] tracking-[0.2em] uppercase py-2 overflow-hidden">
        <div className="marquee">
          {Array.from({ length: 2 }).map((_, k) => (
            <div key={k} className="flex gap-12 px-6 shrink-0">
              <span>Free shipping above ₹999</span>
              <span className="text-jlt-gold">•</span>
              <span>750+ Premium-Inspired Scents</span>
              <span className="text-jlt-gold">•</span>
              <span>Starting ₹449</span>
              <span className="text-jlt-gold">•</span>
              <span>Pan India Delivery</span>
              <span className="text-jlt-gold">•</span>
              <span>WhatsApp Support 10AM–7PM</span>
            </div>
          ))}
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
        <button className="md:hidden" onClick={() => setOpen(!open)} data-testid="mobile-menu-toggle">
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
        <Link to="/" className="flex items-center shrink-0" data-testid="logo-link">
          <img src="/logo.jpg" alt="JLT Fragrances" className="h-16 sm:h-20 w-auto object-contain" />
        </Link>
        <nav className="hidden md:flex items-center gap-7">
          <NavLinks />
        </nav>
        <div className="flex items-center gap-3 sm:gap-4">
          <button onClick={() => setSearchOpen(!searchOpen)} aria-label="Search" data-testid="search-toggle">
            <Search size={20} />
          </button>
          <Link to="/wishlist" className="relative" data-testid="wishlist-link" aria-label="Wishlist">
            <Heart size={20} />
            {wish.length > 0 && <span className="absolute -top-1 -right-1 bg-jlt-gold text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">{wish.length}</span>}
          </Link>
          <Link to="/cart" className="relative" data-testid="cart-link" aria-label="Cart">
            <ShoppingBag size={20} />
            {cartCount > 0 && <span className="absolute -top-1 -right-1 bg-jlt-black text-jlt-ivory text-[10px] rounded-full w-4 h-4 flex items-center justify-center">{cartCount}</span>}
          </Link>
        </div>
      </div>
      {searchOpen && (
        <div className="border-t border-jlt-black/10 bg-white">
          <form onSubmit={submit} className="max-w-3xl mx-auto px-4 py-4">
            <input
              data-testid="search-input"
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by fragrance name, brand, note, or occasion."
              className="input-luxe"
            />
          </form>
        </div>
      )}
      {open && (
        <div className="md:hidden border-t border-jlt-black/10 bg-jlt-ivory px-6 py-6 flex flex-col gap-4" data-testid="mobile-menu">
          <NavLinks onClick={() => setOpen(false)} />
          <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer" className="text-[0.82rem] tracking-[0.14em] uppercase flex items-center gap-2"><Instagram size={16} /> Instagram</a>
        </div>
      )}
    </header>
  );
};

export const Footer = () => (
  <footer className="bg-jlt-black text-jlt-ivory mt-20" data-testid="footer">
    <div className="max-w-7xl mx-auto px-6 py-16 grid grid-cols-2 md:grid-cols-5 gap-10">
      <div className="col-span-2">
        <img src="/logo.jpg" alt="JLT Fragrances" className="h-24 w-auto object-contain bg-jlt-ivory p-2 inline-block" />
        <div className="text-jlt-gold text-[0.7rem] tracking-[0.32em] uppercase mt-3">Smell Premium. Spend Smart.</div>
        <p className="mt-5 text-sm text-jlt-ivory/70 max-w-sm">Luxury-inspired fragrances crafted for everyday confidence. Premium oils, Pan India delivery, starting ₹499.</p>
        <div className="flex gap-4 mt-6">
          <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer" className="line-hover" data-testid="footer-instagram">Instagram</a>
          <a href={waLink()} target="_blank" rel="noreferrer" className="line-hover" data-testid="footer-whatsapp">WhatsApp</a>
          <a href={`mailto:${SUPPORT_EMAIL}`} className="line-hover" data-testid="footer-email">Email</a>
        </div>
      </div>
      <div>
        <div className="text-[0.7rem] tracking-[0.3em] uppercase text-jlt-gold mb-4">Shop</div>
        {[["Shop All", "/shop"], ["Bestsellers", "/bestsellers"], ["Brands", "/brands"], ["Discovery Sets", "/discovery-sets"], ["Find Your Scent", "/find-your-scent"], ["Just Love That", "/just-love-that"]].map(([l, t]) => (
          <Link key={t} to={t} className="block text-sm py-1 text-jlt-ivory/80 hover:text-jlt-gold">{l}</Link>
        ))}
      </div>
      <div>
        <div className="text-[0.7rem] tracking-[0.3em] uppercase text-jlt-gold mb-4">Support</div>
        {[["Contact Us", "/contact"], ["Shipping Policy", "/shipping-policy"], ["Refund Policy", "/refund-policy"]].map(([l, t]) => (
          <Link key={t} to={t} className="block text-sm py-1 text-jlt-ivory/80 hover:text-jlt-gold">{l}</Link>
        ))}
      </div>
      <div>
        <div className="text-[0.7rem] tracking-[0.3em] uppercase text-jlt-gold mb-4">Legal</div>
        {[["Privacy Policy", "/privacy-policy"], ["Terms & Conditions", "/terms"], ["About Us", "/about"]].map(([l, t]) => (
          <Link key={t} to={t} className="block text-sm py-1 text-jlt-ivory/80 hover:text-jlt-gold">{l}</Link>
        ))}
      </div>
    </div>
    <div className="border-t border-jlt-ivory/10">
      <div className="max-w-7xl mx-auto px-6 py-6 text-xs text-jlt-ivory/60 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <p className="max-w-2xl">JLT Fragrances is not affiliated with, endorsed by, or sponsored by any designer or niche fragrance brand mentioned. Names are used only to describe scent inspiration.</p>
        <p>© {new Date().getFullYear()} JLT Fragrances. All rights reserved.</p>
      </div>
    </div>
  </footer>
);

export const WhatsAppFab = () => (
  <a href={waLink()} target="_blank" rel="noreferrer" data-testid="whatsapp-fab"
    className="fixed bottom-6 right-6 z-50 bg-[#25D366] hover:scale-110 transition-all rounded-full w-14 h-14 flex items-center justify-center shadow-2xl">
    <svg width="26" height="26" viewBox="0 0 24 24" fill="white"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.149-.173.198-.297.297-.495.099-.198.05-.372-.025-.521-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z"/></svg>
  </a>
);

export const Layout = ({ children }) => (
  <div className="App">
    <Navbar />
    <main>{children}</main>
    <WhatsAppFab />
    <Footer />
  </div>
);
