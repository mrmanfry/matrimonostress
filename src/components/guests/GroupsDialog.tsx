import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Trash2, Users } from "lucide-react";

interface Group {
  id: string;
  name: string;
  guest_count?: number;
}

interface GroupsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groups: Group[];
  onCreateGroup: (name: string) => Promise<void>;
  onDeleteGroup: (id: string) => Promise<void>;
}

export function GroupsDialog({
  open,
  onOpenChange,
  groups,
  onCreateGroup,
  onDeleteGroup,
}: GroupsDialogProps) {
  const [newGroupName, setNewGroupName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    setLoading(true);
    try {
      await onCreateGroup(newGroupName.trim());
      setNewGroupName("");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Eliminare questo gruppo? Gli invitati non verranno eliminati.")) {
      return;
    }

    setLoading(true);
    try {
      await onDeleteGroup(id);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Gestione Gruppi
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <form onSubmit={handleCreate} className="space-y-2">
            <Label htmlFor="group_name">Nuovo Gruppo</Label>
            <div className="flex gap-2">
              <Input
                id="group_name"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="Es: Famiglia, Amici, Colleghi"
                maxLength={100}
                disabled={loading}
              />
              <Button type="submit" disabled={loading || !newGroupName.trim()}>
                Crea
              </Button>
            </div>
          </form>

          <div className="space-y-2">
            <Label>Gruppi Esistenti ({groups.length})</Label>
            {groups.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Nessun gruppo creato
              </p>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {groups.map((group) => (
                  <Card key={group.id} className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{group.name}</p>
                        {group.guest_count !== undefined && (
                          <p className="text-sm text-muted-foreground">
                            {group.guest_count} invitat{group.guest_count === 1 ? "o" : "i"}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(group.id)}
                        disabled={loading}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
