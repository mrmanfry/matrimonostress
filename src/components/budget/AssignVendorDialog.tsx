import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface AssignVendorDialogProps {
  itemId: string;
  itemDescription: string;
  isOpen: boolean;
  onClose: () => void;
}

export function AssignVendorDialog({ itemId, itemDescription, isOpen, onClose }: AssignVendorDialogProps) {
  const queryClient = useQueryClient();
  const { authState } = useAuth();
  const weddingId = authState.status === "authenticated" ? authState.weddingId : null;
  const [vendorId, setVendorId] = useState("");

  const { data: vendors, isLoading } = useQuery({
    queryKey: ["vendors-list", weddingId],
    queryFn: async () => {
      if (!weddingId) return [];
      const { data } = await supabase
        .from("vendors")
        .select("id, name")
        .eq("wedding_id", weddingId)
        .order("name");
      return data || [];
    },
    enabled: !!weddingId && isOpen,
  });

  const assign = useMutation({
    mutationFn: async () => {
      if (!vendorId) throw new Error("Seleziona un fornitore");
      const { error } = await supabase
        .from("expense_items")
        .update({ vendor_id: vendorId })
        .eq("id", itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budget-spreadsheet"] });
      toast.success("Fornitore assegnato!");
      onClose();
      setVendorId("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assegna Fornitore</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            Collega la voce "<strong>{itemDescription}</strong>" a un fornitore esistente.
          </p>
          
          <div className="space-y-2">
            <Label>Scegli fornitore</Label>
            <Select value={vendorId} onValueChange={setVendorId} disabled={isLoading}>
              <SelectTrigger>
                <SelectValue placeholder={isLoading ? "Caricamento..." : "Seleziona fornitore..."} />
              </SelectTrigger>
              <SelectContent>
                {vendors?.map(v => (
                  <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Annulla
            </Button>
            <Button 
              onClick={() => assign.mutate()} 
              disabled={!vendorId || assign.isPending}
              className="flex-1"
            >
              {assign.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Conferma Assegnazione
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
