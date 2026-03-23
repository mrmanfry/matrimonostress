import { useState, useMemo } from "react";
import { useDraggable } from "@dnd-kit/core";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Utensils, 
  FileText, 
  Users, 
  User, 
  ChevronDown, 
  ChevronRight, 
  Search,
  Filter,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Guest = {
  id: string;
  first_name: string;
  last_name: string;
  dietary_restrictions: string | null;
  notes: string | null;
  adults_count: number;
  children_count: number;
  party_id?: string | null;
  category?: string | null;
};

type GuestPoolProps = {
  guests: Guest[];
  allGuests?: Guest[];
  assignments?: { guest_id: string }[];
  isMobile?: boolean;
};

const DraggableGuest = ({ guest }: { guest: Guest }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: guest.id,
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  const getCategoryColor = (category: string | null) => {
    switch (category?.toUpperCase()) {
      case 'FAMILY':
      case 'FAMIGLIA':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300';
      case 'FRIENDS':
      case 'AMICI':
        return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
      case 'WORK':
      case 'LAVORO':
      case 'COLLEGHI':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`cursor-grab active:cursor-grabbing ${isDragging ? "opacity-50 z-50" : ""}`}
    >
      <div className="p-2 hover:bg-accent/10 transition-colors rounded-md border border-transparent hover:border-border">
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">
              {guest.first_name} {guest.last_name}
            </p>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-xs text-muted-foreground">
                {guest.adults_count} ad.{guest.children_count > 0 && ` + ${guest.children_count} bimbi`}
              </span>
              {guest.category && (
                <Badge variant="outline" className={`text-[10px] px-1 py-0 h-4 ${getCategoryColor(guest.category)}`}>
                  {guest.category}
                </Badge>
              )}
            </div>
          </div>
          <div className="flex gap-0.5 shrink-0">
            {guest.dietary_restrictions && (
              <Badge variant="secondary" className="h-5 w-5 p-0 flex items-center justify-center">
                <Utensils className="w-3 h-3" />
              </Badge>
            )}
            {guest.notes && (
              <Badge variant="secondary" className="h-5 w-5 p-0 flex items-center justify-center">
                <FileText className="w-3 h-3" />
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const PartyGroup = ({ 
  partyId, 
  guests, 
  allGuests,
  assignments,
}: { 
  partyId: string; 
  guests: Guest[];
  allGuests?: Guest[];
  assignments?: { guest_id: string }[];
}) => {
  const [isOpen, setIsOpen] = useState(true);

  const partyMembers = allGuests?.filter(g => g.party_id === partyId) || guests;
  const assignedCount = partyMembers.filter(g => 
    assignments?.some(a => a.guest_id === g.id)
  ).length;
  const isPartiallyAssigned = assignedCount > 0 && assignedCount < partyMembers.length;

  const partyName = `Nucleo ${guests[0]?.last_name || 'Sconosciuto'}`;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className={`w-full justify-between px-2 py-1 h-auto hover:bg-accent/20 ${
            isPartiallyAssigned ? 'bg-amber-50 dark:bg-amber-950/20 border-l-2 border-amber-500' : ''
          }`}
        >
          <div className="flex items-center gap-2">
            {isOpen ? (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            )}
            <Users className="w-4 h-4 text-primary" />
            <span className="font-medium text-sm">{partyName}</span>
          </div>
          <div className="flex items-center gap-1">
            {isPartiallyAssigned && (
              <Badge variant="outline" className="text-[10px] bg-amber-100 text-amber-700 border-amber-300">
                {assignedCount}/{partyMembers.length}
              </Badge>
            )}
            <Badge variant="secondary" className="text-xs">
              {guests.length}
            </Badge>
          </div>
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pl-6 border-l border-border ml-3">
        {guests.map(guest => (
          <DraggableGuest key={guest.id} guest={guest} />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
};

export const GuestPool = ({ guests, allGuests, assignments, isMobile }: GuestPoolProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState<'all' | 'singles' | 'families'>('all');

  const { partyGroups, singles } = useMemo(() => {
    const partyMap = new Map<string, Guest[]>();
    const singleGuests: Guest[] = [];

    guests.forEach(guest => {
      if (guest.party_id) {
        const existing = partyMap.get(guest.party_id) || [];
        existing.push(guest);
        partyMap.set(guest.party_id, existing);
      } else {
        singleGuests.push(guest);
      }
    });

    return {
      partyGroups: Array.from(partyMap.entries()),
      singles: singleGuests,
    };
  }, [guests]);

  const filteredData = useMemo(() => {
    const searchLower = searchQuery.toLowerCase();

    const filteredParties = partyGroups
      .map(([partyId, partyGuests]) => {
        const filtered = partyGuests.filter(g =>
          `${g.first_name} ${g.last_name}`.toLowerCase().includes(searchLower)
        );
        return [partyId, filtered] as [string, Guest[]];
      })
      .filter(([, partyGuests]) => partyGuests.length > 0);

    const filteredSingles = singles.filter(g =>
      `${g.first_name} ${g.last_name}`.toLowerCase().includes(searchLower)
    );

    if (filterMode === 'singles') {
      return { parties: [], singles: filteredSingles };
    } else if (filterMode === 'families') {
      return { parties: filteredParties, singles: [] };
    }

    return { parties: filteredParties, singles: filteredSingles };
  }, [partyGroups, singles, searchQuery, filterMode]);

  const totalCount = filteredData.parties.reduce((sum, [, g]) => sum + g.length, 0) + filteredData.singles.length;

  return (
    <Card className={`p-4 flex flex-col ${isMobile ? 'max-h-[65vh]' : 'h-[calc(100vh-200px)]'}`}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <User className="w-5 h-5 text-primary" />
          Da Assegnare
        </h2>
        <Badge variant="outline">{guests.length}</Badge>
      </div>

      <div className="flex gap-2 mb-3">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Cerca ospite..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8">
              <Filter className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuCheckboxItem
              checked={filterMode === 'all'}
              onCheckedChange={() => setFilterMode('all')}
            >
              Tutti
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={filterMode === 'families'}
              onCheckedChange={() => setFilterMode('families')}
            >
              Solo Nuclei
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={filterMode === 'singles'}
              onCheckedChange={() => setFilterMode('singles')}
            >
              Solo Singoli
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex gap-2 mb-3 text-xs text-muted-foreground">
        <span>{partyGroups.length} nuclei</span>
        <span>•</span>
        <span>{singles.length} singoli</span>
        {searchQuery && (
          <>
            <span>•</span>
            <span className="text-primary">{totalCount} risultati</span>
          </>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-1 pr-4">
          {filteredData.parties.map(([partyId, partyGuests]) => (
            <PartyGroup
              key={partyId}
              partyId={partyId}
              guests={partyGuests}
              allGuests={allGuests}
              assignments={assignments}
            />
          ))}

          {filteredData.singles.length > 0 && (
            <div className="mt-2">
              {filteredData.parties.length > 0 && (
                <p className="text-xs text-muted-foreground mb-1 px-2">Singoli</p>
              )}
              {filteredData.singles.map(guest => (
                <DraggableGuest key={guest.id} guest={guest} />
              ))}
            </div>
          )}

          {guests.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Tutti gli invitati sono stati assegnati! 🎉
            </p>
          )}

          {guests.length > 0 && totalCount === 0 && searchQuery && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nessun risultato per "{searchQuery}"
            </p>
          )}
        </div>
      </ScrollArea>
    </Card>
  );
};
