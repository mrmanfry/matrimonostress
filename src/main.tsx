import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initSessionGuard } from "./utils/sessionGuard";
import { sanitizeUrlIfNeeded } from "./utils/urlSanitizer";

// Pulisce eventuali payload JSON serializzati appesi all'URL da scraper esterni
// (Meta/Facebook, link malformati, estensioni browser) PRIMA che React Router monti.
sanitizeUrlIfNeeded();

// Inizializza il Session Guard per gestire le sessioni volatili
initSessionGuard();

createRoot(document.getElementById("root")!).render(<App />);
