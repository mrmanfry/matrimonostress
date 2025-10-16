import { useDraggable } from "@dnd-kit/core";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Utensils, FileText } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

type Guest = {
  id: string;
  first_name: string;
  last_name: string;
  dietary_restrictions: string | null;
  notes: string | null;
  adults_count: number;
  children_count: number;
};

type GuestPoolProps = {
  guests: Guest[];
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`cursor-grab active:cursor-grabbing ${isDragging ? "opacity-50" : ""}`}
    >
      <Card className="p-3 hover:bg-accent/10 transition-colors">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="font-medium">
              {guest.first_name} {guest.last_name}
            </p>
            <p className="text-xs text-muted-foreground">
              {guest.adults_count} adulti{guest.children_count > 0 && `, ${guest.children_count} bambini`}
            </p>
          </div>
          <div className="flex gap-1">
            {guest.dietary_restrictions && (
              <Badge variant="secondary" className="h-6 w-6 p-0 flex items-center justify-center">
                <Utensils className="w-3 h-3" />
              </Badge>
            )}
            {guest.notes && (
              <Badge variant="secondary" className="h-6 w-6 p-0 flex items-center justify-center">
                <FileText className="w-3 h-3" />
              </Badge>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};

export const GuestPool = ({ guests }: GuestPoolProps) => {
  return (
    <Card className="p-4 h-[calc(100vh-200px)]">
      <h2 className="text-lg font-semibold mb-4">
        Invitati da Assegnare ({guests.length})
      </h2>
      <ScrollArea className="h-[calc(100%-50px)]">
        <div className="space-y-2 pr-4">
          {guests.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Tutti gli invitati sono stati assegnati! 🎉
            </p>
          ) : (
            guests.map(guest => <DraggableGuest key={guest.id} guest={guest} />)
          )}
        </div>
      </ScrollArea>
    </Card>
  );
};
