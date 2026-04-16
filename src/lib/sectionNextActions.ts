import type { NextAction } from "@/components/shared/SectionHeader";

/**
 * State machine deterministica per la "Next Action" di ogni sezione.
 * Regole if/else documentate, priorità top-down: la prima che matcha vince.
 */

// ============================================================================
// /guests
// ============================================================================

export interface GuestsSignals {
  partiesReadyToSendCount: number; // nuclei con almeno 1 telefono e non ancora invitati
  guestsWithoutPhoneCount: number;
  totalRegularGuests: number; // esclusa coppia
  confirmedRate: number; // 0..1
  daysToWedding: number | null;
  onSendInvites: () => void;
  onSyncContacts: () => void;
  onAssignTables: () => void;
  onSendReminders: () => void;
}

export function computeGuestsNextAction(s: GuestsSignals): NextAction | undefined {
  if (s.partiesReadyToSendCount > 0) {
    return {
      title: "Invia gli inviti formali",
      description: `${s.partiesReadyToSendCount} ${
        s.partiesReadyToSendCount === 1 ? "nucleo è pronto" : "nuclei sono pronti"
      } per ricevere il link RSVP.`,
      urgency: "medium",
      cta: { label: "Prepara invii", onClick: s.onSendInvites },
    };
  }

  const withoutPhoneRate =
    s.totalRegularGuests > 0
      ? s.guestsWithoutPhoneCount / s.totalRegularGuests
      : 0;
  if (withoutPhoneRate > 0.3 && s.guestsWithoutPhoneCount > 0) {
    return {
      title: "Sincronizza i contatti",
      description: `${s.guestsWithoutPhoneCount} invitati non hanno un numero di telefono.`,
      urgency: "low",
      cta: { label: "Sincronizza", onClick: s.onSyncContacts },
    };
  }

  if (
    s.daysToWedding !== null &&
    s.daysToWedding <= 30 &&
    s.daysToWedding >= 0 &&
    s.confirmedRate < 0.9 &&
    s.totalRegularGuests > 0
  ) {
    return {
      title: "Invia i solleciti finali",
      description: `Mancano ${s.daysToWedding} giorni e solo il ${Math.round(
        s.confirmedRate * 100
      )}% ha confermato.`,
      urgency: "high",
      cta: { label: "Sollecita", onClick: s.onSendReminders },
    };
  }

  if (s.confirmedRate >= 0.8 && s.totalRegularGuests > 0) {
    return {
      title: "Pronto per assegnare i tavoli",
      description: `Hai più dell'80% di conferme: puoi pianificare la disposizione.`,
      urgency: "low",
      cta: { label: "Vai ai tavoli", onClick: s.onAssignTables },
    };
  }

  return undefined;
}

// ============================================================================
// /budget
// ============================================================================

export interface BudgetSignals {
  nextPaymentDaysUntil: number | null; // giorni alla prossima rata non pagata
  nextPaymentDescription: string | null;
  totalBudget: number;
  totalCommitted: number;
  onPayNow: () => void;
  onReviewBudget: () => void;
}

export function computeBudgetNextAction(s: BudgetSignals): NextAction | undefined {
  // Urgenza alta: scadenza imminente
  if (s.nextPaymentDaysUntil !== null && s.nextPaymentDaysUntil <= 3) {
    const isPast = s.nextPaymentDaysUntil < 0;
    return {
      title: isPast ? "Pagamento in ritardo" : "Pagamento in scadenza",
      description: s.nextPaymentDescription
        ? `${s.nextPaymentDescription} — ${
            isPast
              ? `scaduto da ${Math.abs(s.nextPaymentDaysUntil)} giorni`
              : s.nextPaymentDaysUntil === 0
                ? "scade oggi"
                : `scade tra ${s.nextPaymentDaysUntil} giorni`
          }.`
        : "Vai in tesoreria per saldare la rata.",
      urgency: "high",
      cta: { label: "Apri tesoreria", onClick: s.onPayNow },
    };
  }

  // Urgenza media: scadenza vicina (≤14gg)
  if (s.nextPaymentDaysUntil !== null && s.nextPaymentDaysUntil <= 14) {
    return {
      title: "Prossima rata in arrivo",
      description: s.nextPaymentDescription
        ? `${s.nextPaymentDescription} — scade tra ${s.nextPaymentDaysUntil} giorni.`
        : `Una rata scade tra ${s.nextPaymentDaysUntil} giorni.`,
      urgency: "medium",
      cta: { label: "Vedi scadenza", onClick: s.onPayNow },
    };
  }

  // Urgenza alta: budget superato
  if (s.totalBudget > 0 && s.totalCommitted > s.totalBudget) {
    const over = s.totalCommitted - s.totalBudget;
    return {
      title: "Budget superato",
      description: `Gli impegni superano il budget di ${new Intl.NumberFormat(
        "it-IT",
        { style: "currency", currency: "EUR" }
      ).format(over)}.`,
      urgency: "high",
      cta: { label: "Rivedi budget", onClick: s.onReviewBudget },
    };
  }

  return undefined;
}

// ============================================================================
// /invitations (Campagne)
// ============================================================================

export interface InvitationsSignals {
  partiesReadyToSendCount: number;
  stdSent: number;
  stdResponded: number;
  stdSentDaysAgo: number | null; // giorni dall'ultimo invio STD
  formalInvitesSent: number;
  totalRegular: number;
  onPrepareInvite: () => void;
  onRemindStd: () => void;
}

export function computeInvitationsNextAction(
  s: InvitationsSignals
): NextAction | undefined {
  if (s.partiesReadyToSendCount > 0) {
    return {
      title: "Prepara una nuova partecipazione",
      description: `${s.partiesReadyToSendCount} ${
        s.partiesReadyToSendCount === 1 ? "nucleo è pronto" : "nuclei sono pronti"
      } per ricevere l'invito.`,
      urgency: "medium",
      cta: { label: "Crea campagna", onClick: s.onPrepareInvite },
    };
  }

  const stdResponseRate = s.stdSent > 0 ? s.stdResponded / s.stdSent : 0;
  if (
    s.stdSent > 0 &&
    stdResponseRate < 0.5 &&
    s.stdSentDaysAgo !== null &&
    s.stdSentDaysAgo > 7
  ) {
    return {
      title: "Sollecita le risposte al Save the Date",
      description: `Solo il ${Math.round(
        stdResponseRate * 100
      )}% ha risposto e l'invio risale a oltre una settimana fa.`,
      urgency: "medium",
      cta: { label: "Sollecita", onClick: s.onRemindStd },
    };
  }

  return undefined;
}
