import axios from "axios";

export const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;
export const WHATSAPP_NUMBER = "+910000000000"; // placeholder – share your real WhatsApp business number to wire in
export const WHATSAPP_DISPLAY = "WhatsApp Support";
export const INSTAGRAM_URL = "https://www.instagram.com/jltfragrances?igsh=MWJxamRpdHN5ZmFj";
export const SUPPORT_EMAIL = "justlikethatfragrances@gmail.com";

export const waLink = (text = "Hi JLT Fragrances, I'd like a recommendation.") =>
  `https://wa.me/${WHATSAPP_NUMBER.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(text)}`;

const http = axios.create({ baseURL: API });
http.interceptors.request.use((c) => {
  const t = localStorage.getItem("jlt_admin_token");
  if (t) c.headers.Authorization = `Bearer ${t}`;
  return c;
});
export default http;
