import React from "react";
import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { StoreProvider } from "./lib/store";
import Home from "./pages/Home";
import Shop from "./pages/Shop";
import ProductDetail from "./pages/ProductDetail";
import Bestsellers from "./pages/Bestsellers";
import DiscoverySets from "./pages/DiscoverySets";
import FindYourScent from "./pages/FindYourScent";
import Brands from "./pages/Brands";
import { About, Contact, Shipping, Refund, Privacy, Terms, ComingSoon } from "./pages/StaticPages";
import { Cart, Wishlist, Checkout } from "./pages/CartCheckout";
import { AdminLogin, AdminDashboard } from "./pages/Admin";

function App() {
  return (
    <StoreProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="*" element={
            <Layout>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/shop" element={<Shop />} />
                <Route path="/product/:slug" element={<ProductDetail />} />
                <Route path="/bestsellers" element={<Bestsellers />} />
                <Route path="/brands" element={<Brands />} />
                <Route path="/discovery-sets" element={<DiscoverySets />} />
                <Route path="/find-your-scent" element={<FindYourScent />} />
                <Route path="/about" element={<About />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/shipping-policy" element={<Shipping />} />
                <Route path="/refund-policy" element={<Refund />} />
                <Route path="/privacy-policy" element={<Privacy />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/just-love-that" element={<ComingSoon />} />
                <Route path="/cart" element={<Cart />} />
                <Route path="/wishlist" element={<Wishlist />} />
                <Route path="/checkout" element={<Checkout />} />
              </Routes>
            </Layout>
          } />
        </Routes>
      </BrowserRouter>
    </StoreProvider>
  );
}

export default App;
