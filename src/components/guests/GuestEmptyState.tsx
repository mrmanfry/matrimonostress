import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, Sparkles } from "lucide-react";

interface GuestEmptyStateProps {
  onAddGuest: () => void;
  onSmartImport: () => void;
}

export const GuestEmptyState = ({ onAddGuest, onSmartImport }: GuestEmptyStateProps) => {
  return (
    <Card className="p-12">
      <div className="text-center max-w-md mx-auto space-y-6">
        {/* Icon */}
        <div className="relative mx-auto w-32 h-32 mb-6">
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 animate-pulse" />
          <div className="relative w-full h-full flex items-center justify-center text-6xl">
            👥
          </div>
        </div>

        {/* Text */}
        <div className="space-y-2">
          <h3 className="text-2xl font-bold">La tua lista ospiti è vuota</h3>
          <p className="text-muted-foreground">
            Iniziamo a riempirla! Aggiungi i tuoi invitati uno alla volta o importali rapidamente.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
          <Button onClick={onAddGuest} size="lg">
            <Plus className="w-5 h-5 mr-2" />
            Aggiungi il primo invitato
          </Button>
          <Button 
            onClick={onSmartImport} 
            variant="outline" 
            size="lg"
            className="bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20"
          >
            <Sparkles className="w-5 h-5 mr-2" />
            ✨ Smart Import da testo
          </Button>
        </div>
      </div>
    </Card>
  );
};
