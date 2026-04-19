import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { PartyDetailView } from "./PartyDetailView";
import { GuestDetailView } from "./GuestDetailView";
import { DetailEmpty } from "./DetailEmpty";

interface Guest {
  id: string;
  first_name: string;
  last_name: string;
  alias?: string;
  phone?: string | null;
  is_child: boolean;
  is_couple_member?: boolean;
  allow_plus_one?: boolean;
  plus_one_name?: string | null;
  menu_choice?: string | null;
  dietary_restrictions?: string | null;
  rsvp_status?: string | null;
  std_response?: string | null;
  save_the_date_sent_at?: string | null;
  formal_invite_sent_at?: string | null;
  party_id?: string | null;
  group_id?: string | null;
  group_name?: string | null;
}

interface InviteParty {
  id: string;
  party_name: string;
  rsvp_status: "In attesa" | "Confermato" | "Rifiutato";
  guests: Guest[];
}

export type DetailSelection = { kind: "party" | "guest"; id: string } | null;

interface Props {
  selected: DetailSelection;
  onClose: () => void;
  onSelect: (sel: DetailSelection) => void;
  parties: InviteParty[];
  allGuests: Guest[];
  hasTableAssignedFor?: (partyId: string) => boolean;
  onSendInvite: (selection: { kind: "party" | "guest"; id: string }) => void;
  onRemind: (selection: { kind: "party" | "guest"; id: string }) => void;
  onEditNucleus: (party: InviteParty) => void;
  onEditGuest: (guest: Guest) => void;
  onMenu: (party: InviteParty) => void;
  onDeleteParty: (party: InviteParty) => void;
  onDeleteGuest: (guest: Guest) => void;
}

export function GuestsDetailPanel({
  selected,
  onClose,
  onSelect,
  parties,
  allGuests,
  hasTableAssignedFor,
  onSendInvite,
  onRemind,
  onEditNucleus,
  onEditGuest,
  onMenu,
  onDeleteParty,
  onDeleteGuest,
}: Props) {
  const isMobile = useIsMobile();

  const party = selected?.kind === "party" ? parties.find((p) => p.id === selected.id) ?? null : null;
  const guest = selected?.kind === "guest" ? allGuests.find((g) => g.id === selected.id) ?? null : null;
  const guestParty = guest?.party_id ? parties.find((p) => p.id === guest.party_id) ?? null : null;

  const renderContent = () => {
    if (party) {
      return (
        <PartyDetailView
          party={party}
          hasTableAssigned={hasTableAssignedFor?.(party.id) ?? false}
          onClose={onClose}
          onOpenGuest={(gid) => onSelect({ kind: "guest", id: gid })}
          onSendInvite={() => onSendInvite({ kind: "party", id: party.id })}
          onRemind={() => onRemind({ kind: "party", id: party.id })}
          onEditNucleus={() => onEditNucleus(party)}
          onMenu={() => onMenu(party)}
          onDelete={() => onDeleteParty(party)}
        />
      );
    }
    if (guest) {
      return (
        <GuestDetailView
          guest={guest}
          partyName={guestParty?.party_name ?? null}
          onClose={onClose}
          onSendInvite={() => onSendInvite({ kind: "guest", id: guest.id })}
          onRemind={() => onRemind({ kind: "guest", id: guest.id })}
          onEdit={() => onEditGuest(guest)}
          onDelete={() => onDeleteGuest(guest)}
        />
      );
    }
    return <DetailEmpty />;
  };

  // Mobile: bottom sheet
  if (isMobile) {
    return (
      <Sheet open={!!selected} onOpenChange={(open) => !open && onClose()}>
        <SheetContent
          side="bottom"
          className="h-[90vh] p-0 border-paper-border bg-paper-surface overflow-hidden flex flex-col"
        >
          {renderContent()}
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop: sticky right column inside the parent grid
  return (
    <aside className="hidden lg:block">
      <div
        className="sticky top-20 rounded-xl border border-paper-border bg-paper-surface shadow-sm overflow-hidden flex flex-col"
        style={{ height: "calc(100vh - 110px)" }}
      >
        {renderContent()}
      </div>
    </aside>
  );
}
