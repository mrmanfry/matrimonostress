const LOVABLE_BASE_URL = "https://lovable.dev/?autosubmit=true#prompt=";

export interface WeddingPromptData {
  partner1_name: string;
  partner2_name: string;
  wedding_date?: string | null;
  ceremony_venue_name?: string | null;
  ceremony_venue_address?: string | null;
  reception_venue_name?: string | null;
  reception_venue_address?: string | null;
  wedding_id: string;
  cover_photo_url?: string | null;
}

export interface WizardChoices {
  style: string;
  tone: string;
  sections: {
    story: boolean;
    dressCode: boolean;
    giftRegistry: boolean;
    logistics: boolean;
  };
  enableRsvp: boolean;
}

export const DEFAULT_WIZARD_CHOICES: WizardChoices = {
  style: "Classico ed Elegante",
  tone: "Sobrio e Formale",
  sections: {
    story: false,
    dressCode: false,
    giftRegistry: false,
    logistics: false,
  },
  enableRsvp: true,
};

const STYLE_MAP: Record<string, string> = {
  "Classico ed Elegante":
    "Classic & Elegant. Use refined serif fonts (e.g., Playfair Display) for headings, warm ivory/cream backgrounds, gold or champagne accents, and subtle ornamental details.",
  "Moderno e Minimalista":
    "Modern & Minimalist. Use clean sans-serif typography (e.g., DM Sans), generous whitespace, a neutral palette (white, charcoal, light grey) with one accent color, sharp lines.",
  "Romantico e Floreale":
    "Romantic & Floral. Use delicate serif or script fonts for headings, soft pastel tones (blush pink, dusty rose, sage green), subtle floral watercolor textures or borders.",
  "Rustico e Boho":
    "Rustic & Boho. Use earthy tones (terracotta, olive, warm sand), handwritten or slab-serif fonts, natural textures (linen, kraft paper feel), organic shapes.",
};

export const generateWeddingPrompt = (
  data: WeddingPromptData,
  choices: WizardChoices
): string => {
  const names = `${data.partner1_name} & ${data.partner2_name}`;
  const styleInstruction = STYLE_MAP[choices.style] || STYLE_MAP["Classico ed Elegante"];

  // Build venue/details block
  const detailLines: string[] = [];
  if (data.ceremony_venue_name) {
    detailLines.push(
      `   - Cerimonia: ${data.ceremony_venue_name}${data.ceremony_venue_address ? ` (${data.ceremony_venue_address})` : ""}`
    );
  }
  if (data.reception_venue_name) {
    detailLines.push(
      `   - Ricevimento: ${data.reception_venue_name}${data.reception_venue_address ? ` (${data.reception_venue_address})` : ""}`
    );
  }
  if (data.wedding_date) {
    detailLines.push(`   - Data: ${data.wedding_date}`);
  }

  const detailsBlock =
    detailLines.length > 0
      ? `2. The Details (Mandatory): Display the event information:\n${detailLines.join("\n")}`
      : `2. The Details (Mandatory): Add elegant placeholders for date and venue details.`;

  // Conditional sections
  const optionalSections: string[] = [];
  let sectionNum = 3;
  if (choices.sections.story) {
    optionalSections.push(
      `${sectionNum}. Our Story: A short, elegant timeline or paragraph about the couple. Use placeholder text.`
    );
    sectionNum++;
  }
  if (choices.sections.dressCode) {
    optionalSections.push(
      `${sectionNum}. Dress Code: Add a section indicating the required attire with a placeholder.`
    );
    sectionNum++;
  }
  if (choices.sections.giftRegistry) {
    optionalSections.push(
      `${sectionNum}. Wedding Registry: Add a polite section for gifts or IBAN payment details with placeholders.`
    );
    sectionNum++;
  }
  if (choices.sections.logistics) {
    optionalSections.push(
      `${sectionNum}. Logistics: Add placeholders for recommended hotels and transportation options.`
    );
    sectionNum++;
  }

  const rsvpUrl = `https://matrimonostress.lovable.app/rsvp/${data.wedding_id}`;

  const rsvpBlock = choices.enableRsvp
    ? `
CRITICAL FUNCTIONALITY (RSVP):
Add an RSVP Section at the bottom with a prominent button labeled "Conferma la tua Presenza".
The RSVP button MUST be a standard HTML <a> link that redirects EXACTLY to: ${rsvpUrl}
Do NOT build a form for the RSVP, just use the external link provided above. Do not deviate from this URL.`
    : `
Do NOT add any RSVP buttons, forms, or sections anywhere on the website.`;

  return `
Build a beautiful, modern, and mobile-responsive Wedding Website for ${names}.

DESIGN & THEME INSTRUCTIONS:
- Visual Style: ${styleInstruction}
- Framework: Use Tailwind CSS and shadcn/ui. Ensure perfect mobile responsiveness.
- Add subtle scroll animations for a luxurious feel.

COPYWRITING RULES (CRITICAL!):
- Language: Strictly Italian.
- Tone of Voice: ${choices.tone}.
- STRICT CONSTRAINT: Do NOT use cheesy, cliché, or overly emotional romantic quotes (e.g., avoid phrases like "l'amore vince su tutto", "due anime un cuore", "favola d'amore").
- Keep the text factual, refined, sophisticated, and elegant. Avoid long paragraphs. Less is more.

REQUIRED SECTIONS:
1. Hero Section: Full screen, showing the names "${names}"${data.wedding_date ? `, the date "${data.wedding_date}"` : ""}, and a very brief, elegant welcome.
${detailsBlock}
${optionalSections.join("\n")}
${rsvpBlock}
  `.trim();
};

export const buildLovableUrl = (
  data: WeddingPromptData,
  choices: WizardChoices
): string => {
  const prompt = generateWeddingPrompt(data, choices);
  let url = `${LOVABLE_BASE_URL}${encodeURIComponent(prompt)}`;

  if (data.cover_photo_url) {
    url += `&images=${encodeURIComponent(data.cover_photo_url)}`;
  }

  return url;
};
