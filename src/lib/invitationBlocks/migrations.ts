// Lazy migration: build a block-based InvitationPageSchema from the legacy
// `weddings.campaigns_config` (rsvp / save_the_date) so existing weddings
// "just work" without any DB migration.

import type { InvitationPageSchema, FaqItem, GiftDecoration } from "./types";
import {
  makeCoverBlock,
  makeCeremonyBlock,
  makeReceptionBlock,
  makeRsvpBlock,
  makeGiftRegistryBlock,
  makeFaqBlock,
  makeFooterBlock,
  makeStdMessageBlock,
  makeStdResponseBlock,
  makeDefaultRsvpPage,
  makeDefaultStdPage,
} from "./defaults";

const uid = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `it_${Math.random().toString(36).slice(2, 11)}`;
};

interface WeddingMin {
  partner1_name: string;
  partner2_name: string;
  wedding_date: string;
}

export function legacyRsvpToBlockSchema(
  campaignsConfig: Record<string, unknown> | null | undefined,
  _wedding: WeddingMin
): InvitationPageSchema {
  if (!campaignsConfig) return makeDefaultRsvpPage();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cfg: any = campaignsConfig;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rsvp: any = cfg.rsvp || {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const giftInfo: any = rsvp.gift_info || {};

  // Cover
  const cover = makeCoverBlock({
    imageUrl: rsvp.hero_image_url || null,
    titleStyle: "stacked",
  });

  // Ceremony / Reception (shared image fields live on rsvp.*)
  const ceremony = makeCeremonyBlock({
    imageUrl: rsvp.ceremony_image_url || null,
  });
  const reception = makeReceptionBlock({
    imageUrl: rsvp.reception_image_url || null,
  });

  // RSVP block — overrides for welcome strings
  const rsvpBlock = makeRsvpBlock({
    title: (rsvp.welcome_title || "").trim() || "Conferma la tua Presenza",
    welcomeMessage:
      (rsvp.welcome_text || "").trim() ||
      "Per motivi organizzativi ti preghiamo di confermare la tua presenza.",
  });

  // Gift registry
  const decoration: GiftDecoration = { kind: "icon", iconName: "gift" };
  const giftBlock = makeGiftRegistryBlock({
    decoration,
    message: giftInfo.message || "",
    coupleNames: giftInfo.couple_names || "",
    iban: giftInfo.iban || null,
    bicSwift: giftInfo.bic_swift || null,
    bankName: giftInfo.bank_name || null,
    registryUrl: giftInfo.registry_url || null,
    showCopyButton: true,
  });
  // Hide if not enabled in legacy
  if (giftInfo.enabled === false) giftBlock.visible = false;

  // FAQ
  const legacyFaqs: Array<{ question: string; answer: string }> = Array.isArray(rsvp.faqs)
    ? rsvp.faqs
    : [];
  const items: FaqItem[] = legacyFaqs.map((f) => ({
    id: uid(),
    question: f.question || "",
    answer: f.answer || "",
  }));
  const faqBlock = makeFaqBlock({ items });
  if (items.length === 0) faqBlock.visible = false;

  const footer = makeFooterBlock();

  return {
    version: 1,
    blocks: [cover, ceremony, reception, rsvpBlock, giftBlock, faqBlock, footer],
  };
}

export function legacyStdToBlockSchema(
  campaignsConfig: Record<string, unknown> | null | undefined,
  _wedding: WeddingMin
): InvitationPageSchema {
  if (!campaignsConfig) return makeDefaultStdPage();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cfg: any = campaignsConfig;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const std: any = cfg.save_the_date || {};

  const cover = makeCoverBlock({
    imageUrl: std.hero_image_url || null,
    titleStyle: "stacked",
  });

  const message = makeStdMessageBlock({
    label: (std.welcome_title || "").trim() || "Save The Date",
    quote:
      (std.welcome_text || "").trim() ||
      "Un capitolo d'amore ci aspetta, e vorremmo tu fossi parte di questa storia.",
  });

  const response = makeStdResponseBlock();
  const footer = makeFooterBlock();

  return {
    version: 1,
    blocks: [cover, message, response, footer],
  };
}
