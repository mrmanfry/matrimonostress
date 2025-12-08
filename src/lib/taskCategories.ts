import { FileText, Church, PartyPopper, Shirt, Users, Truck, HelpCircle } from "lucide-react";

// Le 6 macro-aree + "altro" per task non categorizzati
export type TaskMacroCategory = 
  | "amministrativo"
  | "cerimonia"
  | "ricevimento"
  | "look"
  | "fornitori"
  | "logistica"
  | "altro";

export interface MacroCategoryConfig {
  id: TaskMacroCategory;
  label: string;
  icon: typeof FileText;
  color: string; // Tailwind color class
  keywords: string[]; // Keywords for AI-lite inference
}

export const MACRO_CATEGORIES: MacroCategoryConfig[] = [
  {
    id: "amministrativo",
    label: "Amministrativo",
    icon: FileText,
    color: "text-blue-600",
    keywords: ["documento", "certificat", "comune", "anagrafe", "pagament", "acconto", "saldo", "budget", "assicuraz", "corso", "banca", "bonifico", "fattura", "contratto"]
  },
  {
    id: "cerimonia",
    label: "Cerimonia",
    icon: Church,
    color: "text-purple-600",
    keywords: ["cerimonia", "testimon", "chiesa", "altare", "prova generale", "voti", "lettur", "musica cerimonia", "parroco", "religios", "civile", "rito"]
  },
  {
    id: "ricevimento",
    label: "Ricevimento",
    icon: PartyPopper,
    color: "text-pink-600",
    keywords: ["ricevimento", "location", "menu", "menù", "catering", "torta", "musica", "dj", "band", "fiori", "allestiment", "decoraz", "tableau", "tavol", "festa", "ballo"]
  },
  {
    id: "look",
    label: "Look & Stile",
    icon: Shirt,
    color: "text-amber-600",
    keywords: ["abito", "trucco", "parrucch", "scarpe", "accessori", "fedi", "vestito", "gioiell", "beauty", "makeup", "acconciatura", "smalto", "sposa", "sposo"]
  },
  {
    id: "fornitori",
    label: "Fornitori",
    icon: Users,
    color: "text-green-600",
    keywords: ["fotograf", "video", "fiorai", "fiorista", "preventiv", "fornitore", "prenota", "appuntament", "sopralluogo", "incontro"]
  },
  {
    id: "logistica",
    label: "Logistica",
    icon: Truck,
    color: "text-orange-600",
    keywords: ["invitat", "rsvp", "partecipaz", "posti", "trasport", "alloggi", "hotel", "viaggio", "luna di miele", "timeline", "ospiti", "navetta", "parcheggio", "consegna"]
  },
  {
    id: "altro",
    label: "Altro",
    icon: HelpCircle,
    color: "text-muted-foreground",
    keywords: []
  }
];

// Map template categories to macro-areas
const TEMPLATE_CATEGORY_MAP: Record<string, TaskMacroCategory> = {
  // Inizio & Budget
  "Inizio": "amministrativo",
  "Budget": "amministrativo",
  
  // Location & Stile
  "Location": "ricevimento",
  "Stile": "ricevimento",
  
  // Fornitori
  "Fornitori": "fornitori",
  
  // Catering & Intrattenimento
  "Catering": "ricevimento",
  "Intrattenimento": "ricevimento",
  
  // Ruoli & Abbigliamento
  "Ruoli": "cerimonia",
  "Abbigliamento": "look",
  "Beauty": "look",
  "Gioielli": "look",
  
  // Comunicazione & Invitati
  "Comunicazione": "logistica",
  "Invitati": "logistica",
  
  // Luna di Miele & Logistica
  "Luna di Miele": "logistica",
  "Logistica": "logistica",
  
  // Bomboniere & Disposizione
  "Bomboniere": "ricevimento",
  "Disposizione": "ricevimento",
  
  // Eventi Pre-Matrimonio
  "Eventi Pre-Matrimonio": "ricevimento",
  
  // Timeline & Coordinamento
  "Timeline": "logistica",
  "Coordinamento": "fornitori",
  "Organizzazione": "logistica"
};

/**
 * Maps a template category to a macro-area
 */
export function mapTemplateCategoryToMacro(templateCategory: string | undefined): TaskMacroCategory {
  if (!templateCategory) return "altro";
  return TEMPLATE_CATEGORY_MAP[templateCategory] || "altro";
}

/**
 * Infers category from task title using keyword matching (AI-lite)
 */
export function inferCategoryFromTitle(title: string): TaskMacroCategory {
  const lowerTitle = title.toLowerCase();
  
  // Check each category's keywords
  for (const category of MACRO_CATEGORIES) {
    if (category.id === "altro") continue;
    
    for (const keyword of category.keywords) {
      if (lowerTitle.includes(keyword.toLowerCase())) {
        return category.id;
      }
    }
  }
  
  return "altro";
}

/**
 * Gets the configuration for a macro-category
 */
export function getMacroCategoryConfig(categoryId: TaskMacroCategory | string | null | undefined): MacroCategoryConfig {
  const config = MACRO_CATEGORIES.find(c => c.id === categoryId);
  return config || MACRO_CATEGORIES.find(c => c.id === "altro")!;
}

/**
 * Groups tasks by macro-category
 */
export function groupTasksByCategory<T extends { category?: string | null }>(
  tasks: T[]
): Map<TaskMacroCategory, T[]> {
  const groups = new Map<TaskMacroCategory, T[]>();
  
  // Initialize all categories
  for (const cat of MACRO_CATEGORIES) {
    groups.set(cat.id, []);
  }
  
  // Group tasks
  for (const task of tasks) {
    const categoryId = (task.category as TaskMacroCategory) || "altro";
    const existing = groups.get(categoryId) || [];
    existing.push(task);
    groups.set(categoryId, existing);
  }
  
  return groups;
}
