import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users, Baby, Briefcase } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export function BudgetScenarioBar() {
  const queryClient = useQueryClient();
  const { authState } = useAuth();
  const weddingId = authState.status === "authenticated" ? authState.weddingId : null;

  const [counts, setCounts] = useState({
    adults: 100,
    children: 0,
    staff: 0,
  });

  const [debouncedCounts, setDebouncedCounts] = useState(counts);

  // Fetch wedding targets
  const { data: wedding } = useQuery({
    queryKey: ["wedding-targets", weddingId],
    queryFn: async () => {
      if (!weddingId) return null;
      const { data, error } = await supabase
        .from("weddings")
        .select("target_adults, target_children, target_staff")
        .eq("id", weddingId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!weddingId,
  });

  // Initialize from DB
  useEffect(() => {
    if (wedding) {
      const newCounts = {
        adults: wedding.target_adults || 100,
        children: wedding.target_children || 0,
        staff: wedding.target_staff || 0,
      };
      setCounts(newCounts);
      setDebouncedCounts(newCounts);
    }
  }, [wedding]);

  // Debounce effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedCounts(counts);
    }, 500);

    return () => clearTimeout(timer);
  }, [counts]);

  // Update DB with debounced values
  const updateTargets = useMutation({
    mutationFn: async (newCounts: typeof counts) => {
      if (!weddingId) throw new Error("No wedding ID");
      
      const { error } = await supabase
        .from("weddings")
        .update({
          target_adults: newCounts.adults,
          target_children: newCounts.children,
          target_staff: newCounts.staff,
        })
        .eq("id", weddingId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budget-spreadsheet"] });
      queryClient.invalidateQueries({ queryKey: ["wedding-targets"] });
    },
    onError: (error) => {
      toast.error("Errore aggiornamento target: " + error.message);
    },
  });

  // Trigger update when debounced value changes
  useEffect(() => {
    if (wedding && JSON.stringify(debouncedCounts) !== JSON.stringify({
      adults: wedding.target_adults || 100,
      children: wedding.target_children || 0,
      staff: wedding.target_staff || 0,
    })) {
      updateTargets.mutate(debouncedCounts);
    }
  }, [debouncedCounts]);

  const handleChange = (field: keyof typeof counts, value: string) => {
    const num = parseInt(value) || 0;
    setCounts({ ...counts, [field]: num });
  };

  return (
    <Card className="p-4 mb-6 bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
      <div className="flex flex-wrap gap-6 items-center">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-full">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <Label className="text-xs font-semibold text-foreground/70 mb-1 block">
              Adulti Target
            </Label>
            <Input
              type="number"
              className="h-9 w-24 bg-background"
              value={counts.adults}
              onChange={(e) => handleChange("adults", e.target.value)}
              min="0"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-2 bg-pink-500/10 rounded-full">
            <Baby className="w-5 h-5 text-pink-600 dark:text-pink-400" />
          </div>
          <div>
            <Label className="text-xs font-semibold text-foreground/70 mb-1 block">
              Bambini
            </Label>
            <Input
              type="number"
              className="h-9 w-24 bg-background"
              value={counts.children}
              onChange={(e) => handleChange("children", e.target.value)}
              min="0"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/10 rounded-full">
            <Briefcase className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <Label className="text-xs font-semibold text-foreground/70 mb-1 block">
              Staff
            </Label>
            <Input
              type="number"
              className="h-9 w-24 bg-background"
              value={counts.staff}
              onChange={(e) => handleChange("staff", e.target.value)}
              min="0"
            />
          </div>
        </div>

        <div className="ml-auto text-sm text-muted-foreground italic">
          Le spese variabili si aggiornano automaticamente in base a questi numeri
        </div>
      </div>
    </Card>
  );
}
