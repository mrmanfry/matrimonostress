import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listWeddings from "./tools/list-weddings";
import listGuests from "./tools/list-guests";
import listVendors from "./tools/list-vendors";
import budgetSummary from "./tools/budget-summary";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "wedsapp-mcp",
  title: "WedsApp",
  version: "0.1.0",
  instructions:
    "Strumenti per WedsApp — gestionale matrimoni. Usa list_weddings per trovare l'ID del matrimonio, poi list_guests, list_vendors o budget_summary per interrogare i dati.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listWeddings, listGuests, listVendors, budgetSummary],
});
