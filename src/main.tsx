import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Em dev/preview, remove Service Worker e caches antigos para evitar carregar bundles antigos
// (isso pode manter conflitos de React e causar "render2 is not a function").
if (import.meta.env.DEV && "serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    regs.forEach((r) => r.unregister());
  });

  // Limpa caches do Workbox/tiles/etc
  if ("caches" in window) {
    caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
  }
}

createRoot(document.getElementById("root")!).render(<App />);
