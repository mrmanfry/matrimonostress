/**
 * Tableau de Mariage generator — vector-quality PDF + 300 DPI PNG export.
 * Riutilizza il pattern di src/lib/printGeneratorEngine.ts (pdf-lib, Google Fonts embedded).
 */

export const GOOGLE_FONT_TTF_MAP: Record<string, string> = {
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

export const FONT_LABELS: Record<string, string> = {
  garamond: "EB Garamond",
  cormorant: "Cormorant Garamond",
  playfair: "Playfair Display",
  lora: "Lora",
  dancing: "Dancing Script",
  greatvibes: "Great Vibes",
  alex: "Alex Brush",
  pinyon: "Pinyon Script",
  lato: "Lato",
  montserrat: "Montserrat",
  josefin: "Josefin Sans",
  cinzel: "Cinzel",
  philosopher: "Philosopher",
  librebaskerville: "Libre Baskerville",
  raleway: "Raleway",
  poppins: "Poppins",
  merriweather: "Merriweather",
  crimsontext: "Crimson Text",
  italiana: "Italiana",
};

export const CM_TO_PT = 28.3465;

export type TableauDisplayMode = "full" | "first" | "family";
export type TableauAlign = "left" | "center" | "right";

export interface TableauStyle {
  fontFamily: string;
  fontColor: string;
  baseFontSize: number;
  textAlign: TableauAlign;
  displayMode: TableauDisplayMode;
}

export interface TableauBlockPosition {
  x_pct: number;
  y_pct: number;
  w_pct?: number;
}

export interface TableauRenderBlock {
  tableId: string;
  title: string;
  lines: string[];
  position: TableauBlockPosition;
}

export async function fetchGoogleFontBytes(fontKey: string): Promise<ArrayBuffer | null> {
  const fontName = GOOGLE_FONT_TTF_MAP[fontKey];
  if (!fontName) return null;
  try {
    const cssUrl = `https://fonts.googleapis.com/css2?family=${fontName}&display=swap`;
    const cssResp = await fetch(cssUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });
    if (!cssResp.ok) return null;
    const cssText = await cssResp.text();
    const urlMatch = cssText.match(/url\(([^)]+\.(?:woff2|ttf|otf))\)/);
    if (!urlMatch) return null;
    const fontResp = await fetch(urlMatch[1]);
    if (!fontResp.ok) return null;
    return await fontResp.arrayBuffer();
  } catch {
    return null;
  }
}

/**
 * Carica un font Google nel documento per l'anteprima (via <link> CSS).
 */
export function loadGoogleFontForPreview(fontKey: string): void {
  const fontName = GOOGLE_FONT_TTF_MAP[fontKey];
  if (!fontName) return;
  const id = `gf-${fontKey}`;
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${fontName}:wght@400;700&display=swap`;
  document.head.appendChild(link);
}

export function cssFontFamily(fontKey: string): string {
  const fontName = GOOGLE_FONT_TTF_MAP[fontKey];
  if (!fontName) return "serif";
  return `"${fontName.replace(/\+/g, " ")}", serif`;
}

async function loadImageAsBytes(url: string): Promise<{ bytes: Uint8Array; isPng: boolean }> {
  const resp = await fetch(url);
  const buf = await resp.arrayBuffer();
  const arr = new Uint8Array(buf);
  const header = Array.from(arr.slice(0, 4))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return { bytes: arr, isPng: header.startsWith("89504e47") };
}

export interface TableauExportInput {
  backgroundUrl: string;
  widthCm: number;
  heightCm: number;
  style: TableauStyle;
  blocks: TableauRenderBlock[];
}

/**
 * Genera PDF vettoriale alle dimensioni fisiche reali.
 */
export async function generateTableauPDF(input: TableauExportInput): Promise<Blob> {
  const { PDFDocument, rgb, StandardFonts } = await import("pdf-lib");

  const pageW = input.widthCm * CM_TO_PT;
  const pageH = input.heightCm * CM_TO_PT;

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([pageW, pageH]);

  // Background full-bleed
  const { bytes, isPng } = await loadImageAsBytes(input.backgroundUrl);
  const img = isPng ? await pdfDoc.embedPng(bytes) : await pdfDoc.embedJpg(bytes);
  const scale = Math.max(pageW / img.width, pageH / img.height);
  const scaledW = img.width * scale;
  const scaledH = img.height * scale;
  page.drawImage(img, {
    x: (pageW - scaledW) / 2,
    y: (pageH - scaledH) / 2,
    width: scaledW,
    height: scaledH,
  });

  // Font
  let font;
  const fontBytes = await fetchGoogleFontBytes(input.style.fontFamily);
  if (fontBytes) {
    try {
      pdfDoc.registerFontkit(await getFontkit());
      font = await pdfDoc.embedFont(fontBytes, { subset: true });
    } catch {
      font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    }
  } else {
    font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  }

  const hex = input.style.fontColor.replace("#", "");
  const rC = parseInt(hex.substring(0, 2), 16) / 255;
  const gC = parseInt(hex.substring(2, 4), 16) / 255;
  const bC = parseInt(hex.substring(4, 6), 16) / 255;
  const color = rgb(rC, gC, bC);

  // Font size scaling: baseFontSize è in pt logici; scaliamo proporzionalmente alla larghezza.
  // Usiamo direttamente baseFontSize come pt sul PDF (l'utente sceglie in pt).
  const baseSize = input.style.baseFontSize;
  const titleSize = baseSize * 1.4;
  const lineGap = 1.35;

  for (const block of input.blocks) {
    const bx = (block.position.x_pct / 100) * pageW;
    // y_pct è dall'alto; pdf-lib è bottom-up
    const byTop = pageH - (block.position.y_pct / 100) * pageH;
    const bw = ((block.position.w_pct ?? 20) / 100) * pageW;

    let cursorY = byTop - titleSize;
    // Titolo
    drawAlignedText(page, block.title, bx, cursorY, bw, titleSize, font, color, input.style.textAlign);
    cursorY -= titleSize * lineGap;
    for (const line of block.lines) {
      drawAlignedText(page, line, bx, cursorY, bw, baseSize, font, color, input.style.textAlign);
      cursorY -= baseSize * lineGap;
    }
  }

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes as BlobPart], { type: "application/pdf" });
}

async function getFontkit() {
  const mod: any = await import("@pdf-lib/fontkit");
  return mod.default ?? mod;
}

function drawAlignedText(
  page: any,
  text: string,
  boxX: number,
  y: number,
  boxW: number,
  size: number,
  font: any,
  color: any,
  align: TableauAlign,
) {
  const textW = font.widthOfTextAtSize(text, size);
  let x = boxX;
  if (align === "center") x = boxX + Math.max(0, (boxW - textW) / 2);
  else if (align === "right") x = boxX + Math.max(0, boxW - textW);
  page.drawText(text, { x, y, size, font, color });
}

/**
 * Genera PNG a 300 DPI usando canvas.
 */
export async function generateTableauPNG(input: TableauExportInput): Promise<Blob> {
  const pxW = Math.round((input.widthCm / 2.54) * 300);
  const pxH = Math.round((input.heightCm / 2.54) * 300);

  const canvas = document.createElement("canvas");
  canvas.width = pxW;
  canvas.height = pxH;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, pxW, pxH);

  const bg = await loadHtmlImage(input.backgroundUrl);
  const scale = Math.max(pxW / bg.width, pxH / bg.height);
  const sw = bg.width * scale;
  const sh = bg.height * scale;
  ctx.drawImage(bg, (pxW - sw) / 2, (pxH - sh) / 2, sw, sh);

  // Assicura che il font sia caricato
  loadGoogleFontForPreview(input.style.fontFamily);
  await (document as any).fonts?.ready;

  // baseFontSize è in pt (1pt = 1/72"). A 300dpi 1pt = 300/72 px = 4.1667px.
  const ptToPx = 300 / 72;
  const baseSize = input.style.baseFontSize * ptToPx;
  const titleSize = baseSize * 1.4;
  const lineGap = 1.35;
  ctx.fillStyle = input.style.fontColor;
  ctx.textBaseline = "top";
  ctx.textAlign = input.style.textAlign as CanvasTextAlign;
  const fam = cssFontFamily(input.style.fontFamily);

  for (const block of input.blocks) {
    const bx = (block.position.x_pct / 100) * pxW;
    const by = (block.position.y_pct / 100) * pxH;
    const bw = ((block.position.w_pct ?? 20) / 100) * pxW;
    let anchorX = bx;
    if (input.style.textAlign === "center") anchorX = bx + bw / 2;
    else if (input.style.textAlign === "right") anchorX = bx + bw;

    ctx.font = `700 ${titleSize}px ${fam}`;
    ctx.fillText(block.title, anchorX, by);
    let cursorY = by + titleSize * lineGap;
    ctx.font = `400 ${baseSize}px ${fam}`;
    for (const line of block.lines) {
      ctx.fillText(line, anchorX, cursorY);
      cursorY += baseSize * lineGap;
    }
  }

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("PNG generation failed"))),
      "image/png",
    );
  });
}

function loadHtmlImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/**
 * Hash veloce del contenuto per detectare drift post-export.
 */
export function hashBlocksContent(blocks: TableauRenderBlock[]): string {
  const flat = blocks
    .map((b) => `${b.tableId}|${b.title}|${b.lines.join(",")}`)
    .sort()
    .join("||");
  let h = 0;
  for (let i = 0; i < flat.length; i++) {
    h = (h << 5) - h + flat.charCodeAt(i);
    h |= 0;
  }
  return String(h);
}
