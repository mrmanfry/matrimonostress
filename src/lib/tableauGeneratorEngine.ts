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
export const LINE_GAP = 1.35;
export const TITLE_SIZE_MULT = 1.4;

export type TableauDisplayMode = "full" | "first" | "family";
export type TableauAlign = "left" | "center" | "right";
export type TableauBgFit = "contain" | "cover";

export interface TableauStyle {
  fontFamily: string;
  fontColor: string;
  baseFontSize: number;
  textAlign: TableauAlign;
  displayMode: TableauDisplayMode;
  surnameInitialForDuplicates?: boolean;
  bgFit?: TableauBgFit;
  bgBandsColor?: string;
}

export interface TableauTitlePos {
  x_pct: number;
  y_pct: number;
  visible: boolean;
}
export interface TableauListPos {
  x_pct: number;
  y_pct: number;
  w_pct: number;
  columns: 1 | 2 | 3;
}
export interface TableauBlockEntry {
  title: TableauTitlePos;
  list: TableauListPos;
}

/** Legacy format kept for migration only. */
export interface LegacyBlockPos {
  x_pct: number;
  y_pct: number;
  w_pct?: number;
}
/** Alias per backward-compat: alcuni file lo referenziano ancora. */
export type TableauBlockPosition = LegacyBlockPos;

export interface TableauRenderBlock {
  tableId: string;
  title: string;
  lines: string[];
  entry: TableauBlockEntry;
}

/**
 * Migra una entry salvata (formato legacy piatto o nuovo) al nuovo schema.
 */
export function migrateBlockEntry(raw: any, fallbackIndex = 0): TableauBlockEntry {
  if (raw && raw.list && raw.title) {
    return {
      title: {
        x_pct: Number(raw.title.x_pct) || 0,
        y_pct: Number(raw.title.y_pct) || 0,
        visible: raw.title.visible !== false,
      },
      list: {
        x_pct: Number(raw.list.x_pct) || 0,
        y_pct: Number(raw.list.y_pct) || 0,
        w_pct: Number(raw.list.w_pct) || 20,
        columns: (Number(raw.list.columns) as 1 | 2 | 3) || 1,
      },
    };
  }
  if (raw && typeof raw.x_pct === "number") {
    const x = Number(raw.x_pct);
    const y = Number(raw.y_pct);
    const w = Number(raw.w_pct) || 20;
    return {
      title: { x_pct: x, y_pct: Math.max(0, y - 5), visible: true },
      list: { x_pct: x, y_pct: y, w_pct: w, columns: 1 },
    };
  }
  const col = fallbackIndex % 4;
  const row = Math.floor(fallbackIndex / 4);
  const x = 8 + col * 22;
  const y = 12 + row * 25;
  return {
    title: { x_pct: x, y_pct: y, visible: true },
    list: { x_pct: x, y_pct: y + 5, w_pct: 18, columns: 1 },
  };
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

function hexToRgb01(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.substring(0, 2), 16) / 255,
    parseInt(h.substring(2, 4), 16) / 255,
    parseInt(h.substring(4, 6), 16) / 255,
  ];
}

/**
 * Distribuisce N righe in K colonne (top-to-bottom, poi wrap).
 * Restituisce { col, row } per ogni indice.
 */
export function layoutColumns(count: number, columns: number): { col: number; row: number }[] {
  const cols = Math.max(1, Math.min(3, columns || 1));
  const perCol = Math.ceil(count / cols);
  const out: { col: number; row: number }[] = [];
  for (let i = 0; i < count; i++) {
    out.push({ col: Math.floor(i / perCol), row: i % perCol });
  }
  return out;
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

  // Sfondo: rispetta bandsColor + fit contain/cover. Nessun re-encode: embed diretto.
  const bandsHex = input.style.bgBandsColor ?? "#ffffff";
  const [br, bg, bb] = hexToRgb01(bandsHex);
  page.drawRectangle({ x: 0, y: 0, width: pageW, height: pageH, color: rgb(br, bg, bb) });

  const { bytes, isPng } = await loadImageAsBytes(input.backgroundUrl);
  const img = isPng ? await pdfDoc.embedPng(bytes) : await pdfDoc.embedJpg(bytes);
  const fit = input.style.bgFit ?? "cover";
  const scale = fit === "contain"
    ? Math.min(pageW / img.width, pageH / img.height)
    : Math.max(pageW / img.width, pageH / img.height);
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

  const [tr, tg, tb] = hexToRgb01(input.style.fontColor);
  const color = rgb(tr, tg, tb);

  const baseSize = input.style.baseFontSize;
  const titleSize = baseSize * TITLE_SIZE_MULT;

  for (const block of input.blocks) {
    const { title: titlePos, list: listPos } = block.entry;
    const bw = (listPos.w_pct / 100) * pageW;

    if (titlePos.visible) {
      const tx = (titlePos.x_pct / 100) * pageW;
      // y_pct dall'alto; pdf-lib bottom-up.
      const ty = pageH - (titlePos.y_pct / 100) * pageH - titleSize;
      drawAlignedText(page, block.title, tx, ty, bw, titleSize, font, color, input.style.textAlign);
    }

    const cols = listPos.columns || 1;
    const colW = bw / cols;
    const bx = (listPos.x_pct / 100) * pageW;
    const listTopY = pageH - (listPos.y_pct / 100) * pageH;
    const positions = layoutColumns(block.lines.length, cols);
    for (let i = 0; i < block.lines.length; i++) {
      const { col, row } = positions[i];
      const cx = bx + col * colW;
      const cy = listTopY - baseSize - row * baseSize * LINE_GAP;
      drawAlignedText(page, block.lines[i], cx, cy, colW, baseSize, font, color, input.style.textAlign);
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
  ctx.fillStyle = input.style.bgBandsColor ?? "#ffffff";
  ctx.fillRect(0, 0, pxW, pxH);

  const bg = await loadHtmlImage(input.backgroundUrl);
  const fit = input.style.bgFit ?? "cover";
  const scale = fit === "contain"
    ? Math.min(pxW / bg.width, pxH / bg.height)
    : Math.max(pxW / bg.width, pxH / bg.height);
  const sw = bg.width * scale;
  const sh = bg.height * scale;
  ctx.drawImage(bg, (pxW - sw) / 2, (pxH - sh) / 2, sw, sh);

  loadGoogleFontForPreview(input.style.fontFamily);
  await (document as any).fonts?.ready;

  const ptToPx = 300 / 72;
  const baseSize = input.style.baseFontSize * ptToPx;
  const titleSize = baseSize * TITLE_SIZE_MULT;
  ctx.fillStyle = input.style.fontColor;
  ctx.textBaseline = "top";
  ctx.textAlign = input.style.textAlign as CanvasTextAlign;
  const fam = cssFontFamily(input.style.fontFamily);

  for (const block of input.blocks) {
    const { title: titlePos, list: listPos } = block.entry;
    const bw = (listPos.w_pct / 100) * pxW;

    const anchor = (xPx: number, boxW: number) => {
      if (input.style.textAlign === "center") return xPx + boxW / 2;
      if (input.style.textAlign === "right") return xPx + boxW;
      return xPx;
    };

    if (titlePos.visible) {
      const tx = (titlePos.x_pct / 100) * pxW;
      const ty = (titlePos.y_pct / 100) * pxH;
      ctx.font = `700 ${titleSize}px ${fam}`;
      ctx.fillText(block.title, anchor(tx, bw), ty);
    }

    const cols = listPos.columns || 1;
    const colW = bw / cols;
    const bx = (listPos.x_pct / 100) * pxW;
    const by = (listPos.y_pct / 100) * pxH;
    const positions = layoutColumns(block.lines.length, cols);
    ctx.font = `400 ${baseSize}px ${fam}`;
    for (let i = 0; i < block.lines.length; i++) {
      const { col, row } = positions[i];
      const cx = bx + col * colW;
      const cy = by + row * baseSize * LINE_GAP;
      ctx.fillText(block.lines[i], anchor(cx, colW), cy);
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

/** Effective DPI given image px width and physical width in cm. */
export function computeEffectiveDPI(imgWidthPx: number, widthCm: number): number {
  if (!widthCm) return 0;
  return Math.round(imgWidthPx / (widthCm / 2.54));
}
