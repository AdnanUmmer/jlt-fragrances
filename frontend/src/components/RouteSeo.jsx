import React from "react";
import { useLocation } from "react-router-dom";
import http from "../lib/api";

const setMeta = (attr, key, content) => {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!content) { if (el) el.remove(); return; }
  if (!el) { el = document.createElement("meta"); el.setAttribute(attr, key); document.head.appendChild(el); }
  el.setAttribute("content", content);
};

const setCanonical = (href) => {
  let el = document.head.querySelector('link[rel="canonical"]');
  if (!el) { el = document.createElement("link"); el.rel = "canonical"; document.head.appendChild(el); }
  el.href = href;
};

const setJsonLd = (data) => {
  let el = document.getElementById("jlt-jsonld");
  if (!el) { el = document.createElement("script"); el.type = "application/ld+json"; el.id = "jlt-jsonld"; document.head.appendChild(el); }
  el.textContent = JSON.stringify(data);
};

// Applies server-provided (admin-overridable) SEO metadata for the current route.
export const RouteSeo = () => {
  const { pathname } = useLocation();
  React.useEffect(() => {
    let alive = true;
    const origin = window.location.origin;
    const isAdmin = pathname.startsWith("/admin");
    http.get("/seo", { params: { path: pathname } }).then(({ data }) => {
      if (!alive) return;
      document.title = data.title;
      setMeta("name", "description", data.description);
      setMeta("name", "robots", data.noindex || isAdmin ? "noindex, nofollow" : "index, follow");
      setCanonical(data.canonical_url || `${origin}${pathname === "/" ? "" : pathname}`);
      setMeta("property", "og:site_name", data.site_name);
      setMeta("property", "og:type", pathname.startsWith("/product/") ? "product" : "website");
      setMeta("property", "og:title", data.og_title || data.title);
      setMeta("property", "og:description", data.og_description || data.description);
      setMeta("property", "og:url", `${origin}${pathname}`);
      setMeta("property", "og:image", data.og_image);
      setMeta("name", "twitter:card", "summary_large_image");
      setMeta("name", "twitter:title", data.og_title || data.title);
      setMeta("name", "twitter:description", data.og_description || data.description);
      const graph = [
        { "@type": "Organization", name: data.site_name, url: origin },
        { "@type": "WebSite", name: data.site_name, url: origin, potentialAction: { "@type": "SearchAction", target: `${origin}/shop?q={search_term_string}`, "query-input": "required name=search_term_string" } },
      ];
      if (pathname.startsWith("/product/")) {
        graph.push({ "@type": "Product", name: data.title.split(" – ")[0], description: data.description, ...(data.og_image ? { image: data.og_image } : {}), brand: { "@type": "Brand", name: data.site_name } });
      }
      setJsonLd({ "@context": "https://schema.org", "@graph": graph });
    }).catch(() => {});
    return () => { alive = false; };
  }, [pathname]);
  return null;
};
