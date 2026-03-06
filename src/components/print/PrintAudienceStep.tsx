import { useState, useMemo } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { QrCode, AlertTriangle, Printer } from "lucide-react";
import { PartyPrintTarget } from "@/lib/printNameResolver";

interface PrintAudienceStepProps {
  parties: PartyPrintTarget[];
  selectedPartyIds: string[];
  onSelectionChange: (ids: string[]) => void;
  printedPartyIds?: string[];
}

const PrintAudienceStep = ({
  parties,
  selectedPartyIds,
  onSelectionChange,
  printedPartyIds = [],
}: PrintAudienceStepProps) => {
  const [filter, setFilter] = useState<'all' | 'pending'>('all');

  const filtered = useMemo(() => {
    if (filter === 'pending') return parties.filter(p => p.rsvpStatus === 'pending');
    return parties;
  }, [parties, filter]);

  const allSelected = filtered.length > 0 && filtered.every(p => selectedPartyIds.includes(p.partyId));

  const toggleAll = () => {
    if (allSelected) {
      onSelectionChange(selectedPartyIds.filter(id => !filtered.some(p => p.partyId === id)));
    } else {
      const newIds = new Set(selectedPartyIds);
      filtered.forEach(p => newIds.add(p.partyId));
      onSelectionChange(Array.from(newIds));
    }
  };

  const toggleOne = (partyId: string) => {
    if (selectedPartyIds.includes(partyId)) {
      onSelectionChange(selectedPartyIds.filter(id => id !== partyId));
    } else {
      onSelectionChange([...selectedPartyIds, partyId]);
    }
  };

  const selectedGuestCount = parties
    .filter(p => selectedPartyIds.includes(p.partyId))
    .reduce((sum, p) => sum + p.guestCount, 0);

  const statusBadge = (status: PartyPrintTarget['rsvpStatus']) => {
    switch (status) {
      case 'confirmed':
        return <Badge className="bg-[hsl(var(--status-confirmed))] text-white text-xs">Confermato</Badge>;
      case 'declined':
        return <Badge className="bg-[hsl(var(--status-overdue))] text-white text-xs">Rifiutato</Badge>;
      default:
        return <Badge className="bg-[hsl(var(--status-pending))] text-white text-xs">In attesa</Badge>;
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as 'all' | 'pending')}>
          <TabsList>
            <TabsTrigger value="all">Tutti i Nuclei ({parties.length})</TabsTrigger>
            <TabsTrigger value="pending">Solo In Attesa ({parties.filter(p => p.rsvpStatus === 'pending').length})</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={toggleAll}
                />
              </TableHead>
              <TableHead>Nome sull'Invito</TableHead>
              <TableHead className="w-24 text-center">Membri</TableHead>
              <TableHead className="w-32 text-center">Stato RSVP</TableHead>
              <TableHead className="w-36 text-center">Link QR</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                  Nessun nucleo trovato
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((party) => (
                <TableRow key={party.partyId}>
                  <TableCell>
                    <Checkbox
                      checked={selectedPartyIds.includes(party.partyId)}
                      onCheckedChange={() => toggleOne(party.partyId)}
                    />
                  </TableCell>
                  <TableCell className="font-semibold">{party.displayName}</TableCell>
                  <TableCell className="text-center">{party.guestCount}</TableCell>
                  <TableCell className="text-center">{statusBadge(party.rsvpStatus)}</TableCell>
                  <TableCell className="text-center">
                    {party.syncToken ? (
                      <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                        <QrCode className="w-4 h-4" />
                        <span className="font-mono truncate max-w-[80px]">
                          {party.syncToken.substring(0, 8)}…
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-1 text-xs text-[hsl(var(--status-urgent))]">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>No token</span>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="p-4 border-t border-border bg-card text-sm text-muted-foreground">
        Selezionati <strong className="text-foreground">{selectedPartyIds.length}</strong> inviti cartacei
        {' '}(coprono <strong className="text-foreground">{selectedGuestCount}</strong> ospiti)
      </div>
    </div>
  );
};

export default PrintAudienceStep;
