import type { QROverlayConfig } from "@/components/invitations/QRCanvasEditor";

interface PartyTarget {
  partyId: string;
  displayName: string;
  syncToken: string;
}

interface GenerationCallbacks {
  onProgress: (index: number, total: number, partyName: string) => void;
}

/**
 * Sanitize a filename for ZIP entry
 */
function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9À-ÿ\s_-]/g, "").replace(/\s+/g, "_");
}

/**
 * Generate a QR code SVG string for a given URL and color.
 * Uses a simple QR generation approach via qrcode library.
 */
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
 * Main generation engine.
 * Receives template bytes (PDF or image), QR config, and list of parties.
 * Returns a Blob (ZIP if multiple, single PDF if one).
 */
export async function generatePrintPDFs(
  templateBytes: ArrayBuffer,
  templateType: "pdf" | "image",
  qrConfig: QROverlayConfig,
  parties: PartyTarget[],
  rsvpBaseUrl: string,
  callbacks: GenerationCallbacks
): Promise<{ blob: Blob; fileName: string }> {
  const { PDFDocument, rgb } = await import("pdf-lib");

  const pdfBlobs: { name: string; blob: Blob }[] = [];

  for (let i = 0; i < parties.length; i++) {
    const party = parties[i];
    callbacks.onProgress(i + 1, parties.length, party.displayName);

    // Small delay to let UI update
    await new Promise((r) => setTimeout(r, 50));

    let pdfDoc: InstanceType<typeof PDFDocument>;

    if (templateType === "pdf") {
      // Load original PDF
      pdfDoc = await PDFDocument.load(templateBytes);
    } else {
      // Create new PDF with image
      pdfDoc = await PDFDocument.create();
      const imgBytes = new Uint8Array(templateBytes);
      
      // Detect image type
      let img;
      const header = Array.from(imgBytes.slice(0, 4)).map(b => b.toString(16)).join("");
      if (header.startsWith("89504e47")) {
        img = await pdfDoc.embedPng(imgBytes);
      } else {
        img = await pdfDoc.embedJpg(imgBytes);
      }
      
      // A5 dimensions in points: 419.53 x 595.28
      const page = pdfDoc.addPage([419.53, 595.28]);
      const { width: pageW, height: pageH } = page.getSize();
      
      // Scale image to fill page
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

    // Get the first page to inject QR
    const pages = pdfDoc.getPages();
    const page = pages[0];
    const { width: pageW, height: pageH } = page.getSize();

    // Calculate QR position in PDF coordinates
    // qrConfig uses percentage: x/y from top-left, width as % of page width
    const qrWidthPt = (qrConfig.width / 100) * pageW;
    const qrX = (qrConfig.x / 100) * pageW;
    // PDF y-axis is bottom-up, so flip
    const qrY = pageH - (qrConfig.y / 100) * pageH - qrWidthPt;

    // Generate QR code as SVG
    const rsvpUrl = `${rsvpBaseUrl}/${party.syncToken}`;
    const qrSvgBytes = await generateQRSvgBytes(rsvpUrl, qrConfig.color, Math.round(qrWidthPt));

    // Draw quiet zone background if enabled
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

    // Embed QR SVG as image (convert SVG to PNG via canvas for pdf-lib compatibility)
    const qrPngBytes = await svgToPng(qrSvgBytes, Math.round(qrWidthPt * 2));
    const qrImage = await pdfDoc.embedPng(qrPngBytes);

    page.drawImage(qrImage, {
      x: qrX,
      y: qrY,
      width: qrWidthPt,
      height: qrWidthPt,
    });

    const pdfBytes = await pdfDoc.save();
    const fileName = `Invito_${sanitizeFileName(party.displayName)}.pdf`;
    pdfBlobs.push({ name: fileName, blob: new Blob([pdfBytes], { type: "application/pdf" }) });
  }

  if (pdfBlobs.length === 1) {
    return { blob: pdfBlobs[0].blob, fileName: pdfBlobs[0].name };
  }

  // Bundle into ZIP
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  let totalSize = 0;

  for (const { name, blob } of pdfBlobs) {
    zip.file(name, blob);
    totalSize += blob.size;
  }

  // If > 500MB, warn (but still generate single ZIP for now)
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
