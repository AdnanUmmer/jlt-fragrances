import React from "react";
import http from "./api";

export const DEFAULT_SHIPPING = {
  enabled: true,
  threshold: 2000,
  charge_below_threshold: 49,
  charge_at_or_above_threshold: 99,
};

// Mirrors backend calculate_shipping; the backend remains authoritative at order creation.
export const computeShipping = (subtotal, s = DEFAULT_SHIPPING) => {
  if (!s.enabled || subtotal <= 0) return 0;
  return subtotal >= s.threshold ? s.charge_at_or_above_threshold : s.charge_below_threshold;
};

export const useShippingSettings = () => {
  const [settings, setSettings] = React.useState(DEFAULT_SHIPPING);
  React.useEffect(() => {
    let alive = true;
    http.get("/shipping-settings").then((r) => alive && setSettings(r.data)).catch(() => {});
    return () => { alive = false; };
  }, []);
  return settings;
};

export const shippingNote = (s) =>
  s.enabled
    ? `Shipping ₹${s.charge_below_threshold} on orders below ₹${s.threshold}; ₹${s.charge_at_or_above_threshold} on orders of ₹${s.threshold} and above.`
    : "Shipping is currently free.";
