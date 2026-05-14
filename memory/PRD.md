# JLT Fragrances – Product Requirements Document

## Original Problem Statement
Build a complete premium e-commerce website for JLT Fragrances, an India-based luxury-inspired fragrance brand. 750+ inspired fragrances starting at ₹499 with Pan India delivery. Brand structure: "Just Like That" (active inspired collection) and "Just Love That" (Coming Soon for original line). Premium black/ivory/champagne gold palette, elegant typography, mobile-first.

## Architecture
- **Backend**: FastAPI + MongoDB + Motor (async). JWT bearer auth for admin. Routes prefixed `/api`.
- **Frontend**: React 19 + React Router 7 + Tailwind + shadcn/ui + Outfit/Cormorant fonts. Cart & Wishlist via localStorage. Axios with interceptor for admin token.
- **Data**: 791 products auto-seeded from PDF catalogue on first startup; attributes (scent_family, gender, notes, occasions, longevity, projection, mood, season) auto-derived from brand+name keywords.

## User Personas
1. **Buyer (Pan India)** — browses by mood/occasion, takes scent quiz, adds to cart, COD checkout
2. **Admin (single)** — logs in, manages products, bulk imports via CSV

## Core Requirements (static)
- 14 pages: Home, Shop, Product, Bestsellers, Find Your Scent quiz, Discovery Sets, About, Contact, Shipping/Refund/Privacy/Terms policies, Wishlist, Cart, Checkout (layout-only), Coming Soon (Just Love That), Admin Login + Dashboard
- Trust bar, shop-by-mood (7), shop-by-occasion (6), testimonials, Instagram, WhatsApp FAB & recommendation buttons
- Sizes 30/50/100ml at ₹499/₹799/₹1299
- Brand disclaimer on product pages and footer
- SEO-friendly URLs (slug-based)

## Implemented (Feb 2026)
- ✅ Full backend with 14 endpoints (products list/detail/filters/bestsellers, quiz recommend, discovery sets, contact, reviews, JWT auth, admin CRUD, CSV import)
- ✅ 791 products auto-seeded with rich derived attributes
- ✅ All 14 frontend pages with premium design (black/ivory/gold + Cormorant/Outfit fonts)
- ✅ Cart + Wishlist (localStorage), COD checkout-ready layout
- ✅ Admin panel (login at /admin/login → /admin)
- ✅ Testing: 28/28 backend tests pass + frontend critical flows verified
- ✅ Admin: admin@jltfragrances.com / Admin@123

## Backlog
- **P0**: None (MVP complete)
- **P1**: Real product imagery (currently SVG bottle silhouettes), real WhatsApp number, online payment integration (Razorpay/Stripe), order management for admin
- **P2**: User accounts + order history, brute-force lockout on /auth/login, rate limiting, "Just Love That" original line launch, email transactional sends, abandoned cart, Hindi locale
