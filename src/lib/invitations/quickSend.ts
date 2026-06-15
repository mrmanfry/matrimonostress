// Quick Send: scorciatoia puntuale dalla scheda nucleo/ospite.
// Apre WhatsApp con messaggio + link personale del referente, e
// aggiorna in modo ottimistico il campo di tracking corrispondente.
//
// È il primo tassello del Motore Inviti 2.0 (vedi .lovable/plan.md).
// In Fase 1 verrà sostituito dal SendComposer + invitation_deliveries.

import { supabase } from "@/integrations/supabase/client";

export type QuickSendStage = "save_the_date" | "formal_rsvp" | "reminder";
export type QuickSendMode = "auto" | "remind";

interface MinimalGuest {
  id: string;
  first_name: string;
  last_name?: string;
  alias?: string | null;
  phone?: string | null;
  unique_rsvp_token?: string | null;
  save_the_date_sent_at?: string | null;
  formal_invite_sent_at?: string | null;
  std_response?: string | null;
  rsvp_status?: string | null;
  is_couple_member?: boolean | null;
}

interface MinimalParty {
  id: string;
  party_name: string;
  guests: MinimalGuest[];
}

interface CampaignTemplate {
  whatsapp_message_template?: string | null;
}
interface CampaignsConfigLike {
  save_the_date?: CampaignTemplate;
  rsvp?: CampaignTemplate;
}

interface QuickSendCtx {
  weddingSlug?: string | null;
  coupleName: string;
  campaignsConfig?: CampaignsConfigLike | null;
}

const DEFAULT_STD_MSG =
  "Ciao [NomeInvitato]! 💌\nSegnati la data: ci sposiamo!\nA breve i dettagli, intanto dai un'occhiata qui: [LINK_STD]\n\n[NomeCoppia]";

const DEFAULT_RSVP_MSG =
  "Ciao [NomeInvitato]! 💍\nÈ il momento di confermare la tua presenza al nostro matrimonio.\nRispondi qui: [LINK_RSVP]\n\nGrazie!\n[NomeCoppia]";

const DEFAULT_REMINDER_MSG =
  "Ciao [NomeInvitato], un piccolo promemoria gentile 🤗\nCi servirebbe la tua conferma al nostro matrimonio: [LINK_RSVP]\n\nGrazie mille!\n[NomeCoppia]";

/** Sceglie lo stadio di invio in base allo storico del nucleo. */
export function detectStage(party: MinimalParty, mode: QuickSendMode): QuickSendStage {
  const anyStd = party.guests.some((g) => !!g.save_the_date_sent_at);
  const anyFormal = party.guests.some((g) => !!g.formal_invite_sent_at);

  if (mode === "remind") return "reminder";
  if (!anyStd && !anyFormal) return "save_the_date";
  if (anyStd && !anyFormal) return "formal_rsvp";
  return "reminder"; // formal già inviato → solo sollecito
}

/** Trova il referente: preferito quello con telefono + token; fallback al guest selezionato. */
export function pickReferent(
  party: MinimalParty,
  preferredGuestId?: string,
): MinimalGuest | null {
  // 1. guest selezionato se ha telefono
  if (preferredGuestId) {
    const g = party.guests.find((x) => x.id === preferredGuestId);
    if (g?.phone && g.unique_rsvp_token) return g;
  }
  // 2. primo membro non-sposo con telefono + token
  const candidates = party.guests.filter(
    (g) => g.phone && g.unique_rsvp_token && !g.is_couple_member,
  );
  if (candidates.length > 0) return candidates[0];
  // 3. fallback: qualsiasi guest con telefono
  return party.guests.find((g) => g.phone) ?? null;
}

function buildLink(
  stage: QuickSendStage,
  token: string,
  weddingSlug?: string | null,
): string {
  const base = weddingSlug ? `/${weddingSlug}` : "";
  // STD usa path /save-the-date, RSVP e reminder usano /rsvp (link evolutivo)
  const path = stage === "save_the_date" ? "save-the-date" : "rsvp";
  return `${window.location.origin}${base}/${path}/${token}`;
}

function pickTemplate(
  stage: QuickSendStage,
  cfg?: CampaignsConfigLike | null,
): string {
  if (stage === "save_the_date") {
    return cfg?.save_the_date?.whatsapp_message_template?.trim() || DEFAULT_STD_MSG;
  }
  if (stage === "formal_rsvp") {
    return cfg?.rsvp?.whatsapp_message_template?.trim() || DEFAULT_RSVP_MSG;
  }
  // reminder: riusa il template RSVP se esiste, altrimenti default reminder
  return cfg?.rsvp?.whatsapp_message_template?.trim() || DEFAULT_REMINDER_MSG;
}

export interface QuickSendResult {
  ok: boolean;
  error?: string;
  stage?: QuickSendStage;
  referentName?: string;
}

/**
 * Apre WhatsApp e marca il tracking. Da chiamare da onClick handler.
 */
export async function quickSendInvite(
  party: MinimalParty,
  ctx: QuickSendCtx,
  opts: { mode?: QuickSendMode; preferredGuestId?: string } = {},
): Promise<QuickSendResult> {
  const mode = opts.mode ?? "auto";
  const referent = pickReferent(party, opts.preferredGuestId);

  if (!referent) {
    return {
      ok: false,
      error: "Nessun membro del nucleo ha un numero di telefono. Aggiungine uno dalla scheda.",
    };
  }
  if (!referent.unique_rsvp_token) {
    return {
      ok: false,
      error: "Token RSVP non ancora generato per questo invitato. Salva il numero di telefono e riprova.",
    };
  }

  const stage = detectStage(party, mode);
  const link = buildLink(stage, referent.unique_rsvp_token, ctx.weddingSlug);
  const template = pickTemplate(stage, ctx.campaignsConfig);

  const displayName = referent.alias?.trim() || referent.first_name;
  const message = template
    .replace(/\[NomeInvitato\]/g, displayName)
    .replace(/\[LINK_RSVP\]/g, link)
    .replace(/\[LINK_STD\]/g, link)
    .replace(/\[NomeCoppia\]/g, ctx.coupleName);

  const phone = (referent.phone || "").replace(/[^0-9]/g, "");
  const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

  // Apri WhatsApp in nuova tab (deve avvenire in risposta a evento utente)
  window.open(waUrl, "_blank", "noopener,noreferrer");

  // Tracking ottimistico (non blocca l'invio se fallisce)
  try {
    const now = new Date().toISOString();
    const patch: Record<string, string> = {};
    if (stage === "save_the_date") patch.save_the_date_sent_at = now;
    else if (stage === "formal_rsvp") patch.formal_invite_sent_at = now;
    else patch.last_reminder_sent_at = now;

    await supabase.from("guests").update(patch).eq("id", referent.id);
  } catch (e) {
    console.warn("[quickSend] tracking update failed:", e);
  }

  return {
    ok: true,
    stage,
    referentName: displayName,
  };
}
