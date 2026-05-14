import React from "react";
import { Link } from "react-router-dom";

export const About = () => (
  <div className="max-w-4xl mx-auto px-6 py-16" data-testid="about-page">
    <div className="text-center">
      <div className="text-[0.7rem] tracking-[0.3em] uppercase text-jlt-gold">About JLT Fragrances</div>
      <h1 className="font-display text-5xl mt-2">Luxury, made accessible.</h1>
      <div className="divider-gold" />
    </div>
    <div className="mt-8 space-y-5 text-jlt-black/80 leading-relaxed">
      <p>JLT Fragrances was born from a simple belief — premium-quality scent should not be a luxury that's out of reach. We craft 750+ luxury-inspired fragrances using premium oils, faithful to the spirit of the designer and niche compositions that inspire us, while staying honest about what we are.</p>
      <p>Every fragrance is hand-tested for projection, longevity, and that elusive "wow" factor. Starting at ₹499, we deliver Pan India and back every bottle with WhatsApp support and a real human team behind it.</p>
      <p>Our collection lives under two banners: <span className="font-medium">Just Like That</span> — the inspired collection — and <span className="font-medium">Just Love That</span> — our original house line, currently in development.</p>
    </div>
    <div className="mt-12 text-center"><Link to="/shop" className="btn-primary">Explore the Collection</Link></div>
  </div>
);

export const Contact = () => {
  const [form, setForm] = React.useState({ name: "", email: "", phone: "", order_number: "", message: "" });
  const [ok, setOk] = React.useState(null);
  const submit = async (e) => {
    e.preventDefault();
    try {
      const http = (await import("../lib/api")).default;
      await http.post("/contact", form);
      setOk("Thanks! We'll get back within 24 hours.");
      setForm({ name: "", email: "", phone: "", order_number: "", message: "" });
    } catch { setOk("Something went wrong. Please try WhatsApp."); }
  };
  return (
    <div className="max-w-5xl mx-auto px-6 py-16" data-testid="contact-page">
      <div className="text-center mb-10">
        <div className="text-[0.7rem] tracking-[0.3em] uppercase text-jlt-gold">Contact</div>
        <h1 className="font-display text-5xl mt-2">We're here to help</h1>
      </div>
      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-5 text-sm">
          <div><div className="text-[0.7rem] tracking-[0.25em] uppercase text-jlt-black/60">Email</div><a href="mailto:support@jltfragrances.com" className="text-base hover:text-jlt-gold">support@jltfragrances.com</a></div>
          <div><div className="text-[0.7rem] tracking-[0.25em] uppercase text-jlt-black/60">WhatsApp</div><a href={"https://wa.me/910000000000"} target="_blank" rel="noreferrer" className="text-base text-[#25D366]">Chat on WhatsApp</a></div>
          <div><div className="text-[0.7rem] tracking-[0.25em] uppercase text-jlt-black/60">Business Hours</div><div>Monday to Saturday, 10 AM to 7 PM</div></div>
          <div><div className="text-[0.7rem] tracking-[0.25em] uppercase text-jlt-black/60">Order Support</div><div>For order support, please message us with your order number.</div></div>
          <div><div className="text-[0.7rem] tracking-[0.25em] uppercase text-jlt-black/60">Instagram</div><a href="https://www.instagram.com/jltfragrances/" target="_blank" rel="noreferrer" className="text-base hover:text-jlt-gold">@jltfragrances</a></div>
        </div>
        <form onSubmit={submit} className="bg-white border border-jlt-black/10 p-6 space-y-3" data-testid="contact-form">
          <input className="input-luxe" placeholder="Name" required value={form.name} onChange={(e)=>setForm({...form, name:e.target.value})} data-testid="contact-name"/>
          <input className="input-luxe" placeholder="Email" type="email" required value={form.email} onChange={(e)=>setForm({...form, email:e.target.value})} data-testid="contact-email"/>
          <input className="input-luxe" placeholder="Phone (optional)" value={form.phone} onChange={(e)=>setForm({...form, phone:e.target.value})}/>
          <input className="input-luxe" placeholder="Order number (optional)" value={form.order_number} onChange={(e)=>setForm({...form, order_number:e.target.value})}/>
          <textarea rows={4} className="input-luxe" placeholder="Your message" required value={form.message} onChange={(e)=>setForm({...form, message:e.target.value})} data-testid="contact-message"/>
          <button className="btn-primary w-full justify-center" data-testid="contact-submit">Send Message</button>
          {ok && <div className="text-sm text-jlt-gold mt-2" data-testid="contact-success">{ok}</div>}
        </form>
      </div>
    </div>
  );
};

const PolicyShell = ({ title, sections, testId }) => (
  <div className="max-w-3xl mx-auto px-6 py-16" data-testid={testId}>
    <div className="text-center mb-10">
      <div className="text-[0.7rem] tracking-[0.3em] uppercase text-jlt-gold">Policy</div>
      <h1 className="font-display text-5xl mt-2">{title}</h1>
      <div className="divider-gold" />
    </div>
    <div className="space-y-6">
      {sections.map(([h, body], i) => (
        <div key={i}>
          <h2 className="font-display text-xl">{h}</h2>
          <p className="text-sm text-jlt-black/80 mt-2 leading-relaxed whitespace-pre-line">{body}</p>
        </div>
      ))}
    </div>
  </div>
);

export const Shipping = () => (
  <PolicyShell title="Shipping Policy" testId="shipping-policy"
    sections={[
      ["Dispatch Time", "Orders are dispatched within 24–72 hours of payment confirmation."],
      ["Delivery Time", "Pan India delivery typically takes 3–7 business days depending on your location."],
      ["Tracking", "Tracking details are sent to you via email and WhatsApp once your order is dispatched."],
      ["Delays", "Delays may occur for remote pin codes, courier disruptions, or during peak festive periods. We'll always keep you updated."],
      ["Free Shipping", "Free shipping on orders above ₹999. Below that, a nominal shipping fee applies at checkout."],
    ]}/>
);
export const Refund = () => (
  <PolicyShell title="Refund Policy" testId="refund-policy"
    sections={[
      ["Reporting Window", "Damage or wrong-item claims must be reported within 24–48 hours of delivery."],
      ["Required Proof", "Please share clear photo and/or unboxing video evidence with our support team."],
      ["Used Products", "Opened or used perfumes are not returnable unless damaged or incorrect on arrival."],
      ["Approval & Processing", "Approved refunds are processed in 5–7 business days to the original payment method."],
      ["Replacement", "A free replacement is available for genuine damaged or wrong-item claims."],
    ]}/>
);
export const Privacy = () => (
  <PolicyShell title="Privacy Policy" testId="privacy-policy"
    sections={[
      ["What we collect", "Name, email, phone, shipping address, and order history — only what's required to fulfill your orders and provide support."],
      ["How we use it", "To process your orders, communicate updates, and improve your shopping experience."],
      ["Third Parties", "We share data only with payment processors and shipping partners to fulfill your orders. We never sell your data."],
      ["Contact", "For any data concerns, write to support@jltfragrances.com."],
    ]}/>
);
export const Terms = () => (
  <PolicyShell title="Terms & Conditions" testId="terms-page"
    sections={[
      ["Use of Site", "By using this site you agree to these terms. You must be 18+ to place orders."],
      ["Brand Disclaimer", "JLT Fragrances is not affiliated with, endorsed by, or sponsored by any designer or niche fragrance brand mentioned on this site. Names are used only to describe scent inspiration."],
      ["Pricing", "Prices are listed in INR and inclusive of applicable taxes unless stated otherwise."],
      ["Liability", "We are not liable for individual skin reactions. Please patch-test before full use."],
    ]}/>
);

export const ComingSoon = () => (
  <div className="max-w-2xl mx-auto px-6 py-24 text-center" data-testid="coming-soon-page">
    <div className="text-[0.7rem] tracking-[0.3em] uppercase text-jlt-gold">Just Love That</div>
    <h1 className="font-display text-5xl mt-3">Coming Soon</h1>
    <div className="divider-gold" />
    <p className="text-jlt-black/70 mt-4">Our original fragrance house line is in development — bold, modern, and unmistakably ours. Sign up to be the first to know when it launches.</p>
    <Link to="/shop" className="btn-outline mt-8 inline-flex">Shop Just Like That</Link>
  </div>
);
