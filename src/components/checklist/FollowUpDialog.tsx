import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CalendarPlus, Sparkles, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface FollowUpDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (followUp: FollowUpData) => void;
  originalTask: {
    id: string;
    title: string;
    vendor_id: string | null;
    assigned_to: string | null;
  };
}

export interface FollowUpData {
  title: string;
  description: string;
  due_date: string;
  vendor_id: string | null;
  assigned_to: string | null;
  parent_task_id: string;
}

// AI-lite: keyword-based smart suggestions
function getSuggestion(title: string): { title: string; daysOffset: number } | null {
  const lowerTitle = title.toLowerCase();
  
  if (lowerTitle.includes("richiedere preventivo") || lowerTitle.includes("richiesta preventivo")) {
    return { title: "Controllare ricezione preventivo", daysOffset: 5 };
  }
  if (lowerTitle.includes("pagare acconto") || lowerTitle.includes("versare acconto")) {
    return { title: "Verificare pagamento saldo", daysOffset: 30 };
  }
  if (lowerTitle.includes("inviare") || lowerTitle.includes("mandare")) {
    return { title: "Verificare ricezione/conferma", daysOffset: 3 };
  }
  if (lowerTitle.includes("chiamare") || lowerTitle.includes("telefonare") || lowerTitle.includes("contattare")) {
    return { title: "Verificare esito chiamata", daysOffset: 3 };
  }
  if (lowerTitle.includes("prenotare") || lowerTitle.includes("confermare prenotazione")) {
    return { title: "Confermare prenotazione definitiva", daysOffset: 7 };
  }
  if (lowerTitle.includes("ordinare") || lowerTitle.includes("ordine")) {
    return { title: "Verificare consegna ordine", daysOffset: 14 };
  }
  if (lowerTitle.includes("prova") || lowerTitle.includes("appuntamento")) {
    return { title: "Follow-up dopo appuntamento", daysOffset: 2 };
  }
  
  return null;
}

function addDays(date: Date, days: number): string {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result.toISOString().split('T')[0];
}

export function FollowUpDialog({ open, onClose, onConfirm, originalTask }: FollowUpDialogProps) {
  const suggestion = getSuggestion(originalTask.title);
  const defaultDaysOffset = suggestion?.daysOffset || 3;
  
  const [followUp, setFollowUp] = useState<FollowUpData>({
    title: suggestion?.title || `Follow-up: ${originalTask.title}`,
    description: `Continuazione del task: "${originalTask.title}"`,
    due_date: addDays(new Date(), defaultDaysOffset),
    vendor_id: originalTask.vendor_id,
    assigned_to: originalTask.assigned_to,
    parent_task_id: originalTask.id,
  });

  // Reset when dialog opens with new task
  useEffect(() => {
    if (open) {
      const newSuggestion = getSuggestion(originalTask.title);
      const newDaysOffset = newSuggestion?.daysOffset || 3;
      
      setFollowUp({
        title: newSuggestion?.title || `Follow-up: ${originalTask.title}`,
        description: `Continuazione del task: "${originalTask.title}"`,
        due_date: addDays(new Date(), newDaysOffset),
        vendor_id: originalTask.vendor_id,
        assigned_to: originalTask.assigned_to,
        parent_task_id: originalTask.id,
      });
    }
  }, [open, originalTask]);

  const handleConfirm = () => {
    onConfirm(followUp);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarPlus className="h-5 w-5 text-primary" />
            Crea Follow-up
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {suggestion && (
            <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg border border-primary/20">
              <Sparkles className="h-4 w-4 text-primary shrink-0" />
              <span className="text-sm text-muted-foreground">
                Suggerimento AI: <span className="font-medium text-foreground">{suggestion.title}</span> tra {suggestion.daysOffset} giorni
              </span>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="followup-title">Titolo</Label>
            <Input
              id="followup-title"
              value={followUp.title}
              onChange={(e) => setFollowUp(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Titolo del follow-up..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="followup-date">Data scadenza</Label>
            <Input
              id="followup-date"
              type="date"
              value={followUp.due_date}
              onChange={(e) => setFollowUp(prev => ({ ...prev, due_date: e.target.value }))}
            />
            <div className="flex gap-2 flex-wrap">
              <Badge 
                variant="outline" 
                className="cursor-pointer hover:bg-muted"
                onClick={() => setFollowUp(prev => ({ ...prev, due_date: addDays(new Date(), 3) }))}
              >
                +3 giorni
              </Badge>
              <Badge 
                variant="outline" 
                className="cursor-pointer hover:bg-muted"
                onClick={() => setFollowUp(prev => ({ ...prev, due_date: addDays(new Date(), 7) }))}
              >
                +7 giorni
              </Badge>
              <Badge 
                variant="outline" 
                className="cursor-pointer hover:bg-muted"
                onClick={() => setFollowUp(prev => ({ ...prev, due_date: addDays(new Date(), 14) }))}
              >
                +14 giorni
              </Badge>
              <Badge 
                variant="outline" 
                className="cursor-pointer hover:bg-muted"
                onClick={() => setFollowUp(prev => ({ ...prev, due_date: addDays(new Date(), 30) }))}
              >
                +30 giorni
              </Badge>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="followup-description">Note (opzionale)</Label>
            <Textarea
              id="followup-description"
              value={followUp.description}
              onChange={(e) => setFollowUp(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Dettagli aggiuntivi..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter className="flex gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} className="flex-1 sm:flex-none">
            <X className="h-4 w-4 mr-2" />
            Annulla
          </Button>
          <Button onClick={handleConfirm} className="flex-1 sm:flex-none">
            <CalendarPlus className="h-4 w-4 mr-2" />
            Crea Follow-up
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
