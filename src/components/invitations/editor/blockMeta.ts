import type { BlockType, PageKind } from "@/lib/invitationBlocks/types";
import {
  Image,
  Church,
  PartyPopper,
  CheckCircle2,
  Gift,
  HelpCircle,
  Type,
  Images,
  Timer,
  CalendarClock,
  Plane,
  Shirt,
  Minus,
  Sparkles,
  Mail,
  ThumbsUp,
} from "lucide-react";

export interface BlockMeta {
  type: BlockType;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  category: "core" | "content" | "interactive" | "decoration";
  // which page kinds this block can be added to
  allowedOn: PageKind[];
}

export const BLOCK_META: Record<BlockType, BlockMeta> = {
  cover: {
    type: "cover",
    label: "Copertina",
    description: "Immagine + nomi e data",
    icon: Image,
    category: "core",
    allowedOn: ["rsvp", "std"],
  },
  ceremony: {
    type: "ceremony",
    label: "Cerimonia",
    description: "Luogo e orario della cerimonia",
    icon: Church,
    category: "core",
    allowedOn: ["rsvp"],
  },
  reception: {
    type: "reception",
    label: "Ricevimento",
    description: "Luogo e orario del ricevimento",
    icon: PartyPopper,
    category: "core",
    allowedOn: ["rsvp"],
  },
  rsvp: {
    type: "rsvp",
    label: "Conferma RSVP",
    description: "Form di conferma presenza",
    icon: CheckCircle2,
    category: "interactive",
    allowedOn: ["rsvp"],
  },
  gift_registry: {
    type: "gift_registry",
    label: "Lista Nozze",
    description: "IBAN o link a lista nozze",
    icon: Gift,
    category: "content",
    allowedOn: ["rsvp"],
  },
  faq: {
    type: "faq",
    label: "FAQ",
    description: "Domande frequenti",
    icon: HelpCircle,
    category: "content",
    allowedOn: ["rsvp"],
  },
  rich_text: {
    type: "rich_text",
    label: "Testo libero",
    description: "Paragrafo personalizzato",
    icon: Type,
    category: "content",
    allowedOn: ["rsvp", "std"],
  },
  gallery: {
    type: "gallery",
    label: "Galleria",
    description: "Griglia di immagini",
    icon: Images,
    category: "content",
    allowedOn: ["rsvp", "std"],
  },
  countdown: {
    type: "countdown",
    label: "Countdown",
    description: "Conto alla rovescia",
    icon: Timer,
    category: "decoration",
    allowedOn: ["rsvp", "std"],
  },
  schedule: {
    type: "schedule",
    label: "Programma",
    description: "Timeline della giornata",
    icon: CalendarClock,
    category: "content",
    allowedOn: ["rsvp"],
  },
  travel_info: {
    type: "travel_info",
    label: "Info di viaggio",
    description: "Hotel, parcheggi, navette",
    icon: Plane,
    category: "content",
    allowedOn: ["rsvp"],
  },
  dress_code: {
    type: "dress_code",
    label: "Dress code",
    description: "Stile e palette colori",
    icon: Shirt,
    category: "content",
    allowedOn: ["rsvp"],
  },
  divider: {
    type: "divider",
    label: "Separatore",
    description: "Linea o ornamento",
    icon: Minus,
    category: "decoration",
    allowedOn: ["rsvp", "std"],
  },
  footer: {
    type: "footer",
    label: "Footer",
    description: "Chiusura della pagina",
    icon: Sparkles,
    category: "decoration",
    allowedOn: ["rsvp", "std"],
  },
  std_message: {
    type: "std_message",
    label: "Messaggio STD",
    description: "Frase d'invito Save The Date",
    icon: Mail,
    category: "core",
    allowedOn: ["std"],
  },
  std_response: {
    type: "std_response",
    label: "Risposta STD",
    description: "Bottoni Sì / Forse / No",
    icon: ThumbsUp,
    category: "interactive",
    allowedOn: ["std"],
  },
};

export const CATEGORY_LABELS: Record<BlockMeta["category"], string> = {
  core: "Essenziali",
  content: "Contenuto",
  interactive: "Interattivi",
  decoration: "Decorazione",
};
