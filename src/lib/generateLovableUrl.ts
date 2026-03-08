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

export const generateWeddingPrompt = (data: WeddingPromptData): string => {
  const names = `${data.partner1_name} & ${data.partner2_name}`;

  // Build location string from available venue data
  const locationParts: string[] = [];
  if (data.ceremony_venue_name) {
    locationParts.push(`Cerimonia: ${data.ceremony_venue_name}${data.ceremony_venue_address ? ` (${data.ceremony_venue_address})` : ""}`);
  }
  if (data.reception_venue_name) {
    locationParts.push(`Ricevimento: ${data.reception_venue_name}${data.reception_venue_address ? ` (${data.reception_venue_address})` : ""}`);
  }
  const locationBlock = locationParts.length > 0
    ? `3. The Details: Display the event information:\n${locationParts.map(l => `   - ${l}`).join("\n")}${data.wedding_date ? `\n   - Data: ${data.wedding_date}` : ""}`
    : data.wedding_date
      ? `3. The Details: Display the event date "${data.wedding_date}". Add a placeholder for the venue details.`
      : `3. The Details: Add elegant placeholders for date and venue details.`;

  const rsvpUrl = `https://matrimonostress.lovable.app/rsvp/${data.wedding_id}`;

  return `
Build a beautiful, modern, and mobile-responsive Wedding Website for ${names}.

DESIGN INSTRUCTIONS:
- Style: Elegant, romantic, minimalist. Use modern serif typography for headings (e.g., Playfair Display) and clean sans-serif for body text.
- Color Palette: Soft pastel tones (warm white, blush pink, sage green accents) with dark elegant text.
- Framework: Use Tailwind CSS and shadcn/ui. Ensure it looks perfect on mobile devices.
- Add subtle scroll animations for a luxurious feel.

REQUIRED SECTIONS:
1. Hero Section: Full screen, showing the names "${names}"${data.wedding_date ? `, the date "${data.wedding_date}"` : ""}, and a romantic welcoming message.
2. Our Story: A short elegant placeholder section for the couple's story with a timeline layout.
${locationBlock}
4. RSVP Section: A clear, prominent Call-to-Action section at the bottom.

CRITICAL FUNCTIONALITY (RSVP):
Add an RSVP button labeled "Conferma la tua Presenza". The RSVP button MUST be a standard HTML <a> link that redirects EXACTLY to: ${rsvpUrl}
Do NOT build a form for the RSVP, just use the external link provided above. Do not deviate from this URL.

LANGUAGE: All text content must be in Italian.
  `.trim();
};

export const buildLovableUrl = (data: WeddingPromptData): string => {
  const prompt = generateWeddingPrompt(data);
  let url = `${LOVABLE_BASE_URL}${encodeURIComponent(prompt)}`;

  if (data.cover_photo_url) {
    url += `&images=${encodeURIComponent(data.cover_photo_url)}`;
  }

  return url;
};
