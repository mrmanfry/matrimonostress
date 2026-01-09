import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Sparkles, Check, X, Edit2, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Guest {
  id: string;
  first_name: string;
  last_name: string;
}

interface GroupSuggestion {
  party_name: string;
  guest_ids: string[];
  confidence: string;
}

interface SmartGrouperDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ungroupedGuests: Guest[];
  weddingId: string;
  onApprove: (suggestions: GroupSuggestion[]) => Promise<void>;
}

export const SmartGrouperDialog = ({
  open,
  onOpenChange,
  ungroupedGuests,
  weddingId,
  onApprove,
}: SmartGrouperDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<GroupSuggestion[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editedName, setEditedName] = useState("");
  const { toast } = useToast();

  const generateSuggestions = async () => {
    setLoading(true);
    try {
      // Use supabase.functions.invoke which handles auth automatically
      const { data, error } = await supabase.functions.invoke("smart-grouper", {
        body: { 
          guests: ungroupedGuests,
          weddingId: weddingId
        },
      });

      if (error) {
        console.error("Smart grouper error:", error);
        toast({
          title: "Errore",
          description: error.message || "Si è verificato un errore durante l'analisi",
          variant: "destructive",
        });
        return;
      }

      if (data.error) {
        toast({
          title: "Errore",
          description: data.error,
          variant: "destructive",
        });
        return;
      }

      setSuggestions(data.suggestions || []);
    } catch (error) {
      console.error("Error generating suggestions:", error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'analisi",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApproveAll = async () => {
    const approved = suggestions.filter(s => s.confidence !== 'rejected');
    await onApprove(approved);
    onOpenChange(false);
  };

  const handleReject = (index: number) => {
    setSuggestions(prev =>
      prev.map((s, i) => i === index ? { ...s, confidence: 'rejected' } : s)
    );
  };

  const handleEdit = (index: number, currentName: string) => {
    setEditingIndex(index);
    setEditedName(currentName);
  };

  const handleSaveEdit = (index: number) => {
    setSuggestions(prev =>
      prev.map((s, i) => i === index ? { ...s, party_name: editedName } : s)
    );
    setEditingIndex(null);
    setEditedName("");
  };

  const getGuestName = (guestId: string) => {
    const guest = ungroupedGuests.find(g => g.id === guestId);
    return guest ? `${guest.first_name} ${guest.last_name}` : '';
  };

  const handleClose = () => {
    setSuggestions([]);
    setEditingIndex(null);
    setEditedName("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Smart Grouper AI - Raggruppa Automaticamente
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {suggestions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                Analizza la lista di {ungroupedGuests.length} invitati non raggruppati e ricevi suggerimenti intelligenti per creare i nuclei di invito.
              </p>
              <Button
                onClick={generateSuggestions}
                disabled={loading || ungroupedGuests.length === 0}
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analisi in corso...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Genera Suggerimenti
                  </>
                )}
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between pb-2 border-b">
                <p className="text-sm text-muted-foreground">
                  {suggestions.filter(s => s.confidence !== 'rejected').length} proposte di raggruppamento
                </p>
                <Button onClick={handleApproveAll} size="sm">
                  <Check className="w-4 h-4 mr-2" />
                  Approva Tutti
                </Button>
              </div>

              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {suggestions.map((suggestion, index) => (
                    <Card
                      key={index}
                      className={`p-4 ${
                        suggestion.confidence === 'rejected'
                          ? 'opacity-50 bg-muted'
                          : 'hover:shadow-md transition-shadow'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          {/* Party Name */}
                          <div className="flex items-center gap-2">
                            {editingIndex === index ? (
                              <div className="flex items-center gap-2 flex-1">
                                <Input
                                  value={editedName}
                                  onChange={(e) => setEditedName(e.target.value)}
                                  className="h-8"
                                  autoFocus
                                />
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleSaveEdit(index)}
                                  className="h-8 w-8 p-0"
                                >
                                  <Check className="w-4 h-4" />
                                </Button>
                              </div>
                            ) : (
                              <>
                                <h4 className="font-semibold">{suggestion.party_name}</h4>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleEdit(index, suggestion.party_name)}
                                  className="h-6 w-6 p-0"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </Button>
                              </>
                            )}
                          </div>

                          {/* Members */}
                          <div className="flex flex-wrap gap-1">
                            {suggestion.guest_ids.map(guestId => (
                              <Badge key={guestId} variant="secondary" className="text-xs">
                                {getGuestName(guestId)}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        {/* Actions */}
                        {suggestion.confidence !== 'rejected' && (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleReject(index)}
                              className="h-8 w-8 p-0 text-destructive"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
