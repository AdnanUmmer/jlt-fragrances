import React from "react";
import { MessageCircle } from "lucide-react";
import { waLink } from "../lib/api";
import { productOrderMessage, setOrderMessage } from "../lib/whatsapp";

export default function WhatsAppOrder({ product, variant, set, className = "", ...props }) {
  const message = set ? setOrderMessage(set) : productOrderMessage(product, variant);
  return <a href={waLink(message)} target="_blank" rel="noopener noreferrer" className={`btn-outline whatsapp-order ${className}`} {...props}>
    <MessageCircle size={17} aria-hidden="true" className="shrink-0" /><span>Order on WhatsApp</span>
  </a>;
}
