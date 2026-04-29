// Block-based invitation page schema.
// All canonical wedding data (couple names, date, venue addresses) lives in `weddings.*`
// and is NEVER duplicated in blocks. Blocks only carry visual overrides + their own content.

export type PageKind = "rsvp" | "std";

export type BlockType =
  | "cover"
  | "ceremony"
  | "reception"
  | "rsvp"
  | "gift_registry"
  | "faq"
  | "rich_text"
  | "gallery"
  | "countdown"
  | "schedule"
  | "travel_info"
  | "dress_code"
  | "divider"
  | "footer"
  // STD-specific
  | "std_message"
  | "std_response";

export interface BlockStyleOverride {
  backgroundColor?: string;
  textColor?: string;
  accentColor?: string;
  paddingY?: "sm" | "md" | "lg";
}

interface BlockBase {
  id: string;
  visible: boolean;
  style?: BlockStyleOverride;
}

// Vertical focal point for cropped images (object-position)
export type ImagePosition = "top" | "center" | "bottom";

// ---------- Helper structs ----------

export type GiftDecoration =
  | { kind: "icon"; iconName: "gift" | "heart" | "rings" | "plane" | "champagne" }
  | { kind: "image"; imageUrl: string; size: "sm" | "md" | "lg"; rounded: boolean }
  | { kind: "none" };

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

export interface GalleryImage {
  id: string;
  url: string;
  caption: string | null;
}

export interface ScheduleItem {
  id: string;
  time: string;
  label: string;
  description: string;
}

export interface TravelSection {
  id: string;
  heading: string;
  body: string;
}

// ---------- Block configs (discriminated union) ----------

export interface CoverBlock extends BlockBase {
  type: "cover";
  config: {
    imageUrl: string | null;
    title: string; // override of "{partner1} & {partner2}" if non-empty
    subtitle: string | null;
    titleStyle: "stacked" | "single-line";
  };
}

export interface CeremonyBlock extends BlockBase {
  type: "ceremony";
  config: {
    sectionTitle: string;
    imageUrl: string | null;
    mapsButtonLabel: string;
  };
}

export interface ReceptionBlock extends BlockBase {
  type: "reception";
  config: {
    sectionTitle: string;
    imageUrl: string | null;
    mapsButtonLabel: string;
  };
}

export interface RsvpBlock extends BlockBase {
  type: "rsvp";
  config: {
    title: string;
    welcomeMessage: string;
    deadlineLabel: string;
    childLabel: string;
    confirmButtonText: string;
    pendingHelperText: string;
  };
}

export interface GiftRegistryBlock extends BlockBase {
  type: "gift_registry";
  config: {
    title: string;
    imageUrl: string | null;
    decoration: GiftDecoration;
    message: string;
    coupleNames: string;
    iban: string | null;
    bicSwift: string | null;
    bankName: string | null;
    registryUrl: string | null;
    showCopyButton: boolean;
  };
}

export interface FaqBlock extends BlockBase {
  type: "faq";
  config: {
    title: string;
    items: FaqItem[];
    expandBehavior: "single" | "multiple";
  };
}

export interface RichTextBlock extends BlockBase {
  type: "rich_text";
  config: {
    title: string | null;
    content: string; // markdown
    alignment: "left" | "center" | "right";
  };
}

export interface GalleryBlock extends BlockBase {
  type: "gallery";
  config: {
    title: string | null;
    images: GalleryImage[];
    layout: "grid" | "carousel";
    columns: 2 | 3;
  };
}

export interface CountdownBlock extends BlockBase {
  type: "countdown";
  config: {
    title: string | null;
    showDays: boolean;
    showHours: boolean;
    showMinutes: boolean;
    showSeconds: boolean;
  };
}

export interface ScheduleBlock extends BlockBase {
  type: "schedule";
  config: {
    title: string;
    items: ScheduleItem[];
  };
}

export interface TravelInfoBlock extends BlockBase {
  type: "travel_info";
  config: {
    title: string;
    sections: TravelSection[];
  };
}

export interface DressCodeBlock extends BlockBase {
  type: "dress_code";
  config: {
    title: string;
    description: string;
    paletteColors: string[];
    referenceImageUrl: string | null;
  };
}

export interface DividerBlock extends BlockBase {
  type: "divider";
  config: {
    style: "line" | "dots" | "ornament";
  };
}

export interface FooterBlock extends BlockBase {
  type: "footer";
  config: {
    showPoweredBy: boolean;
  };
}

// STD-specific blocks
export interface StdMessageBlock extends BlockBase {
  type: "std_message";
  config: {
    label: string; // e.g. "Save The Date"
    quote: string;
  };
}

export interface StdResponseBlock extends BlockBase {
  type: "std_response";
  config: {
    title: string;
    yesLabel: string;
    maybeLabel: string;
    noLabel: string;
    helperText: string;
    showCalendarButton: boolean;
  };
}

export type InvitationBlock =
  | CoverBlock
  | CeremonyBlock
  | ReceptionBlock
  | RsvpBlock
  | GiftRegistryBlock
  | FaqBlock
  | RichTextBlock
  | GalleryBlock
  | CountdownBlock
  | ScheduleBlock
  | TravelInfoBlock
  | DressCodeBlock
  | DividerBlock
  | FooterBlock
  | StdMessageBlock
  | StdResponseBlock;

export interface InvitationPageSchema {
  version: 1;
  blocks: InvitationBlock[];
}

export interface InvitationPagesConfig {
  rsvp?: InvitationPageSchema;
  std?: InvitationPageSchema;
}
