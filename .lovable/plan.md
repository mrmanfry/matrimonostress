

## Plan: PDF Quality + "Già Generato" Status

### Problem 1: PDF Quality
The current PDF generation renders the hidden node at **400x566px** with `html2canvas scale:2`, producing an **800x1132px** raster. A5 at 300 DPI requires **1748x2480px**. The result is blurry when printed.

**Fix**: Render `HiddenPrintNode` at **1748x2480px** (native 300 DPI for A5) and use `html2canvas({ scale: 1 })`. All font sizes and paddings in the hidden node must be scaled up proportionally (factor ~4.37x). The QR code size goes from 50 to ~220px. This produces a sharp, print-ready raster without relying on html2canvas upscaling.

### Problem 2: "PDF Generated" indicator in Step 2
When the user returns to the Audience step, they have no way to know which parties already had a PDF generated.

**Fix**: Store `printed_party_ids: string[]` inside the existing `print_design` JSONB column in `weddings`. After successful PDF generation, save the list of party IDs that were included. In `PrintAudienceStep`, show a small "PDF generato" badge next to parties that are in that list.

No new migration needed -- we just add a field to the existing JSONB blob.

### Technical Details

**HiddenPrintNode.tsx** -- Change dimensions and font sizes:
- Container: `width: 1748px`, `height: 2480px`
- All `fontSize` values multiplied by ~4.37 (e.g. `11px` → `48px`, `18px` → `79px`, `13px` → `57px`)
- Paddings/margins scaled proportionally
- QRCodeSVG `size={220}`
- Remove `scale: 2` from html2canvas call, use `scale: 1`

**PrintInvitationEditor.tsx** -- After successful PDF generation:
- Save `printed_party_ids` array to `print_design` JSONB
- Pass `printedPartyIds` prop to `PrintAudienceStep`

**PrintAudienceStep.tsx** -- New column/badge:
- Accept `printedPartyIds: string[]` prop
- Show a `<Badge>` "PDF generato" with a printer icon next to parties whose ID is in the list

### Files to modify
1. `src/components/print/HiddenPrintNode.tsx` -- Scale up to 300 DPI native resolution
2. `src/components/print/PrintInvitationEditor.tsx` -- html2canvas scale:1, save printed_party_ids after generation, pass to audience step
3. `src/components/print/PrintAudienceStep.tsx` -- Show "PDF generato" badge

