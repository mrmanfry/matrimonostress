import type {
  InvitationBlock,
  InvitationPageSchema,
  CoverBlock,
  CeremonyBlock,
  ReceptionBlock,
  RsvpBlock,
  GiftRegistryBlock,
  FaqBlock,
  RichTextBlock,
  GalleryBlock,
  CountdownBlock,
  ScheduleBlock,
  TravelInfoBlock,
  DressCodeBlock,
  DividerBlock,
  FooterBlock,
  StdMessageBlock,
  StdResponseBlock,
} from "./types";

const uid = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `blk_${Math.random().toString(36).slice(2, 11)}_${Date.now().toString(36)}`;
};

export function makeCoverBlock(overrides: Partial<CoverBlock["config"]> = {}): CoverBlock {
  return {
    id: uid(),
    type: "cover",
    visible: true,
    config: {
      imageUrl: null,
      imagePosition: "center",
      title: "",
      subtitle: null,
      titleStyle: "stacked",
      ...overrides,
    },
  };
}

export function makeCeremonyBlock(overrides: Partial<CeremonyBlock["config"]> = {}): CeremonyBlock {
  return {
    id: uid(),
    type: "ceremony",
    visible: true,
    config: {
      sectionTitle: "La Cerimonia",
      imageUrl: null,
      mapsButtonLabel: "Apri in Maps",
      ...overrides,
    },
  };
}

export function makeReceptionBlock(overrides: Partial<ReceptionBlock["config"]> = {}): ReceptionBlock {
  return {
    id: uid(),
    type: "reception",
    visible: true,
    config: {
      sectionTitle: "Il Ricevimento",
      imageUrl: null,
      mapsButtonLabel: "Apri in Maps",
      ...overrides,
    },
  };
}

export function makeRsvpBlock(overrides: Partial<RsvpBlock["config"]> = {}): RsvpBlock {
  return {
    id: uid(),
    type: "rsvp",
    visible: true,
    config: {
      title: "Conferma la tua Presenza",
      welcomeMessage: "Per motivi organizzativi ti preghiamo di confermare la tua presenza.",
      deadlineLabel: "Rispondi entro il",
      childLabel: "Bambino/a",
      confirmButtonText: "Conferma Presenza",
      pendingHelperText: "Indica per ogni persona se sarà presente o meno",
      ...overrides,
    },
  };
}

export function makeGiftRegistryBlock(overrides: Partial<GiftRegistryBlock["config"]> = {}): GiftRegistryBlock {
  return {
    id: uid(),
    type: "gift_registry",
    visible: true,
    config: {
      title: "La Lista Nozze",
      imageUrl: null,
      decoration: { kind: "icon", iconName: "gift" },
      message: "",
      coupleNames: "",
      iban: null,
      bicSwift: null,
      bankName: null,
      registryUrl: null,
      showCopyButton: true,
      ...overrides,
    },
  };
}

export function makeFaqBlock(overrides: Partial<FaqBlock["config"]> = {}): FaqBlock {
  return {
    id: uid(),
    type: "faq",
    visible: true,
    config: {
      title: "Info Utili",
      items: [],
      expandBehavior: "single",
      ...overrides,
    },
  };
}

export function makeRichTextBlock(overrides: Partial<RichTextBlock["config"]> = {}): RichTextBlock {
  return {
    id: uid(),
    type: "rich_text",
    visible: true,
    config: { title: null, content: "", alignment: "center", ...overrides },
  };
}

export function makeGalleryBlock(overrides: Partial<GalleryBlock["config"]> = {}): GalleryBlock {
  return {
    id: uid(),
    type: "gallery",
    visible: true,
    config: { title: null, images: [], layout: "grid", columns: 3, ...overrides },
  };
}

export function makeCountdownBlock(overrides: Partial<CountdownBlock["config"]> = {}): CountdownBlock {
  return {
    id: uid(),
    type: "countdown",
    visible: true,
    config: {
      title: "Manca poco!",
      showDays: true,
      showHours: true,
      showMinutes: true,
      showSeconds: false,
      ...overrides,
    },
  };
}

export function makeScheduleBlock(overrides: Partial<ScheduleBlock["config"]> = {}): ScheduleBlock {
  return {
    id: uid(),
    type: "schedule",
    visible: true,
    config: { title: "Il Programma", items: [], ...overrides },
  };
}

export function makeTravelInfoBlock(overrides: Partial<TravelInfoBlock["config"]> = {}): TravelInfoBlock {
  return {
    id: uid(),
    type: "travel_info",
    visible: true,
    config: { title: "Informazioni Utili", sections: [], ...overrides },
  };
}

export function makeDressCodeBlock(overrides: Partial<DressCodeBlock["config"]> = {}): DressCodeBlock {
  return {
    id: uid(),
    type: "dress_code",
    visible: true,
    config: {
      title: "Dress Code",
      description: "",
      paletteColors: [],
      referenceImageUrl: null,
      ...overrides,
    },
  };
}

export function makeDividerBlock(overrides: Partial<DividerBlock["config"]> = {}): DividerBlock {
  return {
    id: uid(),
    type: "divider",
    visible: true,
    config: { style: "line", ...overrides },
  };
}

export function makeFooterBlock(overrides: Partial<FooterBlock["config"]> = {}): FooterBlock {
  return {
    id: uid(),
    type: "footer",
    visible: true,
    config: { showPoweredBy: true, ...overrides },
  };
}

export function makeStdMessageBlock(overrides: Partial<StdMessageBlock["config"]> = {}): StdMessageBlock {
  return {
    id: uid(),
    type: "std_message",
    visible: true,
    config: {
      label: "Save The Date",
      quote: "Un capitolo d'amore ci aspetta, e vorremmo tu fossi parte di questa storia.",
      ...overrides,
    },
  };
}

export function makeStdResponseBlock(overrides: Partial<StdResponseBlock["config"]> = {}): StdResponseBlock {
  return {
    id: uid(),
    type: "std_response",
    visible: true,
    config: {
      title: "Pensi di esserci?",
      yesLabel: "Ci sarò",
      maybeLabel: "Forse",
      noLabel: "Non potrò",
      helperText: "Non vincolante - ci aiuta a organizzarci!",
      showCalendarButton: true,
      ...overrides,
    },
  };
}

export function makeDefaultRsvpPage(): InvitationPageSchema {
  return {
    version: 1,
    blocks: [
      makeCoverBlock(),
      makeCeremonyBlock(),
      makeReceptionBlock(),
      makeRsvpBlock(),
      makeGiftRegistryBlock(),
      makeFaqBlock(),
      makeFooterBlock(),
    ],
  };
}

export function makeDefaultStdPage(): InvitationPageSchema {
  return {
    version: 1,
    blocks: [
      makeCoverBlock({ titleStyle: "stacked" }),
      makeStdMessageBlock(),
      makeStdResponseBlock(),
      makeFooterBlock(),
    ],
  };
}
