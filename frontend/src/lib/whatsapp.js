// One URL builder for every storefront WhatsApp link. Official number is passed
// from existing configuration; the message never changes the destination.
export const whatsappUrl = (number, message) =>
  `https://wa.me/${number.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`;

export const productOrderMessage = (product, variant) => [
  "Hello JLT Fragrances,", "", "I would like to order:", "",
  `Product: ${product.name}`, `Brand/Inspiration: ${product.brand_inspiration}`,
  `Size: ${variant.size}`, `Price: ₹${variant.price}`, "",
  "Please help me complete my order.",
].join("\n");

export const setOrderMessage = (set) => [
  "Hello JLT Fragrances,", "", "I would like to order:", "",
  `Discovery Set / Bundle: ${set.title}`,
  ...(set.subtitle ? [`Option: ${set.subtitle}`] : []),
  ...(set.size ? [`Size per fragrance: ${set.size}`] : []),
  ...(set.items ? [`Fragrances: ${set.items}`] : []),
  `Price: ₹${set.price}`, "", "Please help me choose the fragrances and complete my order.",
].join("\n");
