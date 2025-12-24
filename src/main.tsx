import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initSessionGuard } from "./utils/sessionGuard";

// Inizializza il Session Guard per gestire le sessioni volatili
initSessionGuard();

createRoot(document.getElementById("root")!).render(<App />);
