import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, Plus, Pencil, Trash2, UserPlus, Hotel, Users } from "lucide-react";
import { RoomDialog, type RoomFormData } from "./RoomDialog";
import { RoomAssignmentDialog } from "./RoomAssignmentDialog";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { syncAccommodationExpense } from "@/lib/accommodationSync";

interface Room {
  id: string;
  room_name: string;
  room_type: string;
  capacity: number;
  price_per_night: number;
  nights: number;
  notes: string | null;
  order_index: number;
  assignments: { guest_id: string; guest_first_name: string; guest_last_name: string }[];
}

interface Guest {
  id: string;
  first_name: string;
  last_name: string;
  rsvp_status: string | null;
}

interface HotelCardProps {
  vendor: { id: string; name: string; contact_name: string | null };
  rooms: Room[];
  guests: Guest[];
  allAssignedGuestIds: Set<string>;
  weddingId: string;
}

export const HotelCard = ({ vendor, rooms, guests, allAssignedGuestIds, weddingId }: HotelCardProps) => {
  const [isOpen, setIsOpen] = useState(true);
  const [roomDialogOpen, setRoomDialogOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<(Room & { formData: RoomFormData }) | null>(null);
  const [assignRoom, setAssignRoom] = useState<Room | null>(null);
  const [saving, setSaving] = useState(false);
  const qc = useQueryClient();

  const totalCost = rooms.reduce((sum, r) => sum + r.price_per_night * r.nights, 0);
  const totalAssigned = rooms.reduce((sum, r) => sum + r.assignments.length, 0);
  const totalCapacity = rooms.reduce((sum, r) => sum + r.capacity, 0);

  const handleAddRoom = async (data: RoomFormData) => {
    setSaving(true);
    const { error } = await supabase.from("accommodation_rooms").insert({
      wedding_id: weddingId,
      vendor_id: vendor.id,
      room_name: data.room_name,
      room_type: data.room_type,
      capacity: data.capacity,
      price_per_night: data.price_per_night,
      nights: data.nights,
      notes: data.notes || null,
      order_index: rooms.length,
    });
    setSaving(false);
    if (error) { toast.error("Errore nel salvare la camera"); return; }
    toast.success("Camera aggiunta");
    setRoomDialogOpen(false);
    qc.invalidateQueries({ queryKey: ["accommodation-rooms"] });
  };

  const handleEditRoom = async (data: RoomFormData) => {
    if (!editingRoom) return;
    setSaving(true);
    const { error } = await supabase.from("accommodation_rooms").update({
      room_name: data.room_name,
      room_type: data.room_type,
      capacity: data.capacity,
      price_per_night: data.price_per_night,
      nights: data.nights,
      notes: data.notes || null,
    }).eq("id", editingRoom.id);
    setSaving(false);
    if (error) { toast.error("Errore nel modificare la camera"); return; }
    toast.success("Camera aggiornata");
    setEditingRoom(null);
    qc.invalidateQueries({ queryKey: ["accommodation-rooms"] });
  };

  const handleDeleteRoom = async (roomId: string) => {
    const { error } = await supabase.from("accommodation_rooms").delete().eq("id", roomId);
    if (error) { toast.error("Errore nell'eliminare la camera"); return; }
    toast.success("Camera eliminata");
    qc.invalidateQueries({ queryKey: ["accommodation-rooms"] });
  };

  const handleSaveAssignments = async (guestIds: string[]) => {
    if (!assignRoom) return;
    setSaving(true);
    // Delete existing assignments for this room
    await supabase.from("accommodation_assignments").delete().eq("room_id", assignRoom.id);
    // Insert new
    if (guestIds.length > 0) {
      const rows = guestIds.map(gid => ({ room_id: assignRoom.id, guest_id: gid }));
      const { error } = await supabase.from("accommodation_assignments").insert(rows);
      if (error) { toast.error("Errore nell'assegnazione"); setSaving(false); return; }
    }
    setSaving(false);
    toast.success("Assegnazioni aggiornate");
    setAssignRoom(null);
    qc.invalidateQueries({ queryKey: ["accommodation-rooms"] });
  };

  const roomTypeLabel: Record<string, string> = {
    singola: "Singola", doppia: "Doppia", tripla: "Tripla", suite: "Suite", family: "Family"
  };

  return (
    <>
      <Card>
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    <Hotel className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{vendor.name}</CardTitle>
                    {vendor.contact_name && <p className="text-xs text-muted-foreground">{vendor.contact_name}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right text-sm">
                    <div className="font-semibold">{rooms.length} camere</div>
                    <div className="text-muted-foreground text-xs flex items-center gap-1">
                      <Users className="w-3 h-3" /> {totalAssigned}/{totalCapacity}
                    </div>
                  </div>
                  <Badge variant="outline" className="font-mono">
                    € {totalCost.toLocaleString("it-IT", { minimumFractionDigits: 2 })}
                  </Badge>
                  {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <CardContent className="pt-0">
              {rooms.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Camera</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-center">Capacità</TableHead>
                      <TableHead className="text-right">€/notte</TableHead>
                      <TableHead className="text-center">Notti</TableHead>
                      <TableHead className="text-right">Totale</TableHead>
                      <TableHead>Ospiti</TableHead>
                      <TableHead className="w-24"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rooms.map(room => (
                      <TableRow key={room.id}>
                        <TableCell className="font-medium">{room.room_name}</TableCell>
                        <TableCell>{roomTypeLabel[room.room_type] || room.room_type}</TableCell>
                        <TableCell className="text-center">{room.capacity}</TableCell>
                        <TableCell className="text-right font-mono">
                          {room.price_per_night.toLocaleString("it-IT", { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-center">{room.nights}</TableCell>
                        <TableCell className="text-right font-mono font-semibold">
                          € {(room.price_per_night * room.nights).toLocaleString("it-IT", { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {room.assignments.length > 0 ? (
                              room.assignments.map(a => (
                                <Badge key={a.guest_id} variant="secondary" className="text-[10px]">
                                  {a.guest_first_name} {a.guest_last_name?.charAt(0)}.
                                </Badge>
                              ))
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setAssignRoom(room)}>
                              <UserPlus className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingRoom({
                              ...room,
                              formData: {
                                room_name: room.room_name,
                                room_type: room.room_type,
                                capacity: room.capacity,
                                price_per_night: room.price_per_night,
                                nights: room.nights,
                                notes: room.notes || "",
                              }
                            })}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteRoom(room.id)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">Nessuna camera ancora. Aggiungine una!</p>
              )}

              <div className="mt-4 flex justify-end">
                <Button variant="outline" size="sm" onClick={() => setRoomDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-1" /> Aggiungi Camera
                </Button>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Add room dialog */}
      <RoomDialog
        open={roomDialogOpen}
        onOpenChange={setRoomDialogOpen}
        onSave={handleAddRoom}
        loading={saving}
      />

      {/* Edit room dialog */}
      <RoomDialog
        open={!!editingRoom}
        onOpenChange={(o) => !o && setEditingRoom(null)}
        onSave={handleEditRoom}
        initialData={editingRoom?.formData}
        loading={saving}
      />

      {/* Assignment dialog */}
      {assignRoom && (
        <RoomAssignmentDialog
          open={!!assignRoom}
          onOpenChange={(o) => !o && setAssignRoom(null)}
          roomName={assignRoom.room_name}
          capacity={assignRoom.capacity}
          guests={guests}
          assignedGuestIds={assignRoom.assignments.map(a => a.guest_id)}
          allAssignedGuestIds={allAssignedGuestIds}
          onSave={handleSaveAssignments}
          loading={saving}
        />
      )}
    </>
  );
};
