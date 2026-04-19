import type { MassBookletContent } from "@/lib/massBookletSchema";

/**
 * Lightweight estimate of the number of A5 pages the booklet will produce.
 * Used only for the "page count" badge in the live preview header — the
 * authoritative pagination is computed by @react-pdf when the PDF is rendered.
 */
export function estimateBookletPages(c: MassBookletContent): number {
  let pages = 1; // cover

  // rite intro + greeting
  pages += 1;

  // readings (each main reading is its own page)
  const r = c.readings;
  if (r.first_reading || r.use_custom_first_reading) pages += 1;
  if (r.psalm || r.use_custom_psalm) pages += 1;
  if (r.second_reading || r.use_custom_second_reading) pages += 1;
  if (r.gospel || r.use_custom_gospel) pages += 1;

  // consent / rings
  pages += 1;

  // prayers of the faithful
  if (c.prayers.intentions.filter(Boolean).length > 0) pages += 1;

  // eucharistic liturgy (longer for full mass)
  if (c.rite_type === "messa_eucaristia") {
    pages += 2; // Padre Nostro + canti eucaristici
  } else {
    pages += 1; // Padre Nostro only
  }

  // thanks page
  if (c.thanks?.text?.trim()) pages += 1;

  // back cover (often blank in a 4-fold print)
  pages += 1;

  return pages;
}
