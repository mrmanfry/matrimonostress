import type { QROverlayConfig } from "@/components/invitations/QRCanvasEditor";
import type { GreetingOverlayConfig } from "@/components/invitations/OverlayCanvasEditor";
import { generateGreetingString, type MockParty } from "@/lib/greetingEngine";
import type { FontStyle } from "@/components/print/PrintDesignStep";

/**
 * Map fontStyle keys to Google Fonts TTF URLs for PDF embedding.
 * We fetch the regular (400) weight TTF file directly from Google Fonts CSS2 API.
 */
const GOOGLE_FONT_TTF_MAP: Partial<Record<FontStyle, string>> = {
  garamond: "EB+Garamond",
  cormorant: "Cormorant+Garamond",
  playfair: "Playfair+Display",
  lora: "Lora",
  dancing: "Dancing+Script",
  greatvibes: "Great+Vibes",
  alex: "Alex+Brush",
  pinyon: "Pinyon+Script",
  lato: "Lato",
  montserrat: "Montserrat",
  josefin: "Josefin+Sans",
  cinzel: "Cinzel",
  philosopher: "Philosopher",
  librebaskerville: "Libre+Baskerville",
  raleway: "Raleway",
  poppins: "Poppins",
  merriweather: "Merriweather",
  crimsontext: "Crimson+Text",
  italiana: "Italiana",
};

/** Preview canvas reference width (matches CSS maxWidth in OverlayCanvasEditor) */
const PREVIEW_CANVAS_REF_WIDTH = 500;
/** Preview applies this scale factor to fontSize */
const PREVIEW_FONT_SCALE = 0.4;

/**
 * Fetch a Google Font TTF and return its bytes for pdf-lib embedding.
 * Returns null on failure so we can fallback to Helvetica.
 */
async function fetchGoogleFontBytes(fontStyle: FontStyle): Promise<ArrayBuffer | null> {
  const fontName = GOOGLE_FONT_TTF_MAP[fontStyle];
  if (!fontName) return null;

  try {
    // Request CSS with TTF user-agent trick
    const cssUrl = `https://fonts.googleapis.com/css2?family=${fontName}&display=swap`;
    const cssResp = await fetch(cssUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    });
    if (!cssResp.ok) return null;

    const cssText = await cssResp.text();
    // Extract first TTF/WOFF2 URL from the CSS
    const urlMatch = cssText.match(/url\(([^)]+\.(?:woff2|ttf|otf))\)/);
    if (!urlMatch) return null;

    const fontResp = await fetch(urlMatch[1]);
    if (!fontResp.ok) return null;

    return await fontResp.arrayBuffer();
  } catch {
    return null;
  }
}

interface PartyTarget {
  partyId: string;
  displayName: string;
  syncToken: string;
}

interface GenerationCallbacks {
  onProgress: (index: number, total: number, partyName: string) => void;
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9À-ÿ\s_-]/g, "").replace(/\s+/g, "_");
}

async function generateQRSvgBytes(url: string, color: string, size: number): Promise<Uint8Array> {
  const QRCode = (await import("qrcode")).default;
  const svgString = await QRCode.toString(url, {
    type: "svg",
    color: { dark: color, light: "#00000000" },
    width: size,
    margin: 0,
    errorCorrectionLevel: "M",
  });
  return new TextEncoder().encode(svgString);
}

/**
 * Build a simple MockParty from displayName for greeting rendering.
 * In a real scenario we'd pass full guest data; for now we parse displayName.
 */
function buildMockPartyFromName(displayName: string): MockParty {
  const parts = displayName.split(" e ");
  if (parts.length === 2) {
    // Couple: "Marco Rossi e Giulia Bianchi"
    const [first, ...lastParts1] = parts[0].trim().split(" ");
    const [first2, ...lastParts2] = parts[1].trim().split(" ");
    return {
      isNucleo: false,
      members: [
        { name: first || parts[0], lastName: lastParts1.join(" ") || "." },
        { name: first2 || parts[1], lastName: lastParts2.join(" ") || "." },
      ],
    };
  }
  if (displayName.startsWith("Famiglia ")) {
    const familyName = displayName.replace("Famiglia ", "");
    return {
      isNucleo: true,
      nucleusName: displayName,
      members: [{ name: familyName, lastName: familyName }],
    };
  }
  // Single
  const [first, ...lastParts] = displayName.split(" ");
  return {
    isNucleo: false,
    members: [{ name: first || displayName, lastName: lastParts.join(" ") || "." }],
  };
}

/**
 * Main generation engine.
 */
export async function generatePrintPDFs(
  templateBytes: ArrayBuffer,
  templateType: "pdf" | "image",
  qrConfig: QROverlayConfig,
  parties: PartyTarget[],
  rsvpBaseUrl: string,
  callbacks: GenerationCallbacks,
  greetingConfig?: GreetingOverlayConfig
): Promise<{ blob: Blob; fileName: string }> {
  const { PDFDocument, rgb, StandardFonts } = await import("pdf-lib");

  // Pre-load a standard font for greeting text (custom font embedding is complex;
  // we use Helvetica as a reliable fallback for PDF generation)
  let greetingFont: Awaited<ReturnType<typeof PDFDocument.prototype.embedFont>> | null = null;

  const pdfBlobs: { name: string; blob: Blob }[] = [];

  for (let i = 0; i < parties.length; i++) {
    const party = parties[i];
    callbacks.onProgress(i + 1, parties.length, party.displayName);

    await new Promise((r) => setTimeout(r, 50));

    let pdfDoc: Awaited<ReturnType<typeof PDFDocument.load>>;

    // Clone the ArrayBuffer so pdf-lib doesn't detach the original
    const clonedBytes = templateBytes.slice(0);

    if (templateType === "pdf") {
      pdfDoc = await PDFDocument.load(clonedBytes);
    } else {
      pdfDoc = await PDFDocument.create();
      const imgBytes = new Uint8Array(clonedBytes);

      let img;
      const header = Array.from(imgBytes.slice(0, 4)).map(b => b.toString(16)).join("");
      if (header.startsWith("89504e47")) {
        img = await pdfDoc.embedPng(imgBytes);
      } else {
        img = await pdfDoc.embedJpg(imgBytes);
      }

      const page = pdfDoc.addPage([419.53, 595.28]);
      const { width: pageW, height: pageH } = page.getSize();

      const scale = Math.max(pageW / img.width, pageH / img.height);
      const scaledW = img.width * scale;
      const scaledH = img.height * scale;

      page.drawImage(img, {
        x: (pageW - scaledW) / 2,
        y: (pageH - scaledH) / 2,
        width: scaledW,
        height: scaledH,
      });
    }

    const pages = pdfDoc.getPages();
    const page = pages[0];
    const { width: pageW, height: pageH } = page.getSize();

    // --- QR Code ---
    const qrWidthPt = (qrConfig.width / 100) * pageW;
    const qrX = (qrConfig.x / 100) * pageW;
    const qrY = pageH - (qrConfig.y / 100) * pageH - qrWidthPt;

    const rsvpUrl = `${rsvpBaseUrl}/${party.syncToken}`;
    const qrSvgBytes = await generateQRSvgBytes(rsvpUrl, qrConfig.color, Math.round(qrWidthPt));

    if (qrConfig.quietZone) {
      const padding = qrWidthPt * 0.08;
      page.drawRectangle({
        x: qrX - padding,
        y: qrY - padding,
        width: qrWidthPt + padding * 2,
        height: qrWidthPt + padding * 2,
        color: rgb(1, 1, 1),
      });
    }

    const qrPngBytes = await svgToPng(qrSvgBytes, Math.round(qrWidthPt * 2));
    const qrImage = await pdfDoc.embedPng(qrPngBytes);

    page.drawImage(qrImage, {
      x: qrX,
      y: qrY,
      width: qrWidthPt,
      height: qrWidthPt,
    });

    // --- Greeting Text ---
    if (greetingConfig) {
      if (!greetingFont) {
        greetingFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
      } else {
        // Re-embed for each new doc
        greetingFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
      }

      const mockParty = buildMockPartyFromName(party.displayName);
      const greeting = generateGreetingString({
        greetingType: greetingConfig.greetingType,
        customGreeting: greetingConfig.customGreeting,
        useAka: greetingConfig.useAka,
        party: mockParty,
      });

      if (greeting.full) {
        const greetFontSize = greetingConfig.fontSize;
        const greetWidthPt = (greetingConfig.width / 100) * pageW;
        const greetX = (greetingConfig.x / 100) * pageW;
        // PDF y is bottom-up; greeting y is from top
        const greetY = pageH - (greetingConfig.y / 100) * pageH - greetFontSize;

        // Parse color hex to RGB
        const hex = greetingConfig.color.replace("#", "");
        const r = parseInt(hex.substring(0, 2), 16) / 255;
        const g = parseInt(hex.substring(2, 4), 16) / 255;
        const b = parseInt(hex.substring(4, 6), 16) / 255;

        // Center text within the greeting box
        const textWidth = greetingFont.widthOfTextAtSize(greeting.full, greetFontSize);
        const textX = greetX + Math.max(0, (greetWidthPt - textWidth) / 2);

        page.drawText(greeting.full, {
          x: textX,
          y: greetY,
          size: greetFontSize,
          font: greetingFont,
          color: rgb(r, g, b),
        });
      }
    }

    const pdfBytes = await pdfDoc.save();
    const fileName = `Invito_${sanitizeFileName(party.displayName)}.pdf`;
    pdfBlobs.push({ name: fileName, blob: new Blob([pdfBytes as BlobPart], { type: "application/pdf" }) });
  }

  if (pdfBlobs.length === 1) {
    return { blob: pdfBlobs[0].blob, fileName: pdfBlobs[0].name };
  }

  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();

  for (const { name, blob } of pdfBlobs) {
    zip.file(name, blob);
  }

  const zipBlob = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
  const today = new Date().toISOString().slice(0, 10);
  return { blob: zipBlob, fileName: `Inviti_Custom_${today}.zip` };
}

/**
 * Convert SVG bytes to PNG bytes using an offscreen canvas.
 */
async function svgToPng(svgBytes: Uint8Array, size: number): Promise<Uint8Array> {
  const svgString = new TextDecoder().decode(svgBytes);
  const blob = new Blob([svgString], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, size, size);
      URL.revokeObjectURL(url);

      canvas.toBlob((blob) => {
        if (!blob) return reject(new Error("Failed to create PNG"));
        blob.arrayBuffer().then((buf) => resolve(new Uint8Array(buf)));
      }, "image/png");
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load QR SVG"));
    };
    img.src = url;
  });
}
