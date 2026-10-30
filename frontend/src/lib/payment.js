let checkoutPromise;

export function loadPaymentCheckout() {
  if (window.Razorpay) return Promise.resolve();
  if (checkoutPromise) return checkoutPromise;
  checkoutPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    const fail = () => {
      clearTimeout(timer);
      script.remove();
      checkoutPromise = undefined;
      reject(new Error("Payment checkout could not load. Check your connection and try again."));
    };
    const timer = setTimeout(fail, 15000);
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => {
      if (!window.Razorpay) return fail();
      clearTimeout(timer);
      resolve();
    };
    script.onerror = fail;
    document.body.appendChild(script);
  });
  return checkoutPromise;
}
