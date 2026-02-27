import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface JoinWeddingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialCode?: string;
}

export function JoinWeddingDialog({ open, onOpenChange, initialCode = "" }: JoinWeddingDialogProps) {
  const [code, setCode] = useState(initialCode);
  const [joining, setJoining] = useState(false);
  const { refreshAuth } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setJoining(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non autenticato");

      // Find wedding by access code
      const { data: weddingData, error: weddingError } = await supabase
        .from("weddings")
        .select("id")
        .eq("access_code", code.toUpperCase().trim())
        .single();

      if (weddingError || !weddingData) {
        throw new Error("Codice non valido");
      }

      // Check if already a member
      const { data: existingRole } = await supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", user.id)
        .eq("wedding_id", weddingData.id)
        .maybeSingle();

      if (existingRole) {
        throw new Error("Sei già un collaboratore di questo matrimonio");
      }

      // Look up invitation to get proper role
      const userEmail = user.email;
      let assignedRole: string = "manager"; // fallback

      if (userEmail) {
        const { data: invitation } = await supabase
          .from("wedding_invitations")
          .select("id, role, status")
          .eq("wedding_id", weddingData.id)
          .eq("email", userEmail)
          .eq("status", "pending")
          .maybeSingle();

        if (invitation) {
          assignedRole = invitation.role;
          // Mark invitation as accepted
          await supabase
            .from("wedding_invitations")
            .update({ status: "accepted" })
            .eq("id", invitation.id);
        }
      }

      // Create the role
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({
          user_id: user.id,
          wedding_id: weddingData.id,
          role: assignedRole as any,
        });

      if (roleError) throw roleError;

      await refreshAuth();
      queryClient.invalidateQueries();

      toast({
        title: "Accesso effettuato! 🎉",
        description: "Ora puoi collaborare a questo matrimonio",
      });

      onOpenChange(false);
      navigate("/app/dashboard");
    } catch (error: any) {
      console.error("Error joining wedding:", error);
      toast({
        title: "Errore",
        description: error.message || "Impossibile accedere al matrimonio",
        variant: "destructive",
      });
    } finally {
      setJoining(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Unisciti a un Matrimonio</DialogTitle>
          <DialogDescription>
            Inserisci il codice di accesso che hai ricevuto via email
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleJoin} className="space-y-4">
          <div>
            <Label htmlFor="joinCode">Codice di Accesso</Label>
            <Input
              id="joinCode"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="WED-XXXX"
              className="font-mono uppercase text-center text-lg mt-1.5"
              maxLength={8}
              required
              disabled={joining}
              autoFocus
            />
          </div>
          <Button
            type="submit"
            className="w-full"
            disabled={joining || code.trim().length < 8}
          >
            {joining ? "Accesso in corso..." : "Accedi al Matrimonio"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
