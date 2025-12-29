import { useState, useEffect } from "react";
import { ExpenseItemsManager } from "../ExpenseItemsManager";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign } from "lucide-react";
import { CalculationModeToggle } from "@/components/ui/calculation-mode-toggle";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface VendorExpensesWidgetProps {
  vendorId: string;
  categoryId?: string | null;
}

export function VendorExpensesWidget({ vendorId, categoryId }: VendorExpensesWidgetProps) {
  const { toast } = useToast();
  const [globalMode, setGlobalMode] = useState<'planned' | 'expected' | 'confirmed'>('planned');
  const [weddingId, setWeddingId] = useState<string | null>(null);
  const [weddingTargets, setWeddingTargets] = useState({ adults: 100, children: 0, staff: 0 });
  const [guestBreakdown, setGuestBreakdown] = useState({
    confirmed: 0,
    pending: 0,
    declined: 0
  });

  useEffect(() => {
    loadWeddingData();
  }, []);

  const loadWeddingData = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data: userRole } = await supabase
        .from("user_roles")
        .select("wedding_id")
        .eq("user_id", userData.user.id)
        .single();

      if (!userRole) return;

      setWeddingId(userRole.wedding_id);

      // Load wedding data including calculation_mode and targets
      const { data: wedding } = await supabase
        .from("weddings")
        .select("calculation_mode, target_adults, target_children, target_staff")
        .eq("id", userRole.wedding_id)
        .single();

      if (wedding) {
        setGlobalMode((wedding.calculation_mode as 'planned' | 'expected' | 'confirmed') || 'planned');
        setWeddingTargets({
          adults: wedding.target_adults || 100,
          children: wedding.target_children || 0,
          staff: wedding.target_staff || 0
        });
      }

      // Load guest breakdown for toggle display
      const { data: guests } = await supabase
        .from("guests")
        .select("is_child, is_staff, rsvp_status")
        .eq("wedding_id", userRole.wedding_id);

      if (guests) {
        const confirmed = guests.filter(g => g.rsvp_status === 'confirmed').length;
        const pending = guests.filter(g => g.rsvp_status === 'pending').length;
        const declined = guests.filter(g => g.rsvp_status === 'declined').length;
        setGuestBreakdown({ confirmed, pending, declined });
      }
    } catch (error) {
      console.error("Error loading wedding data:", error);
    }
  };

  const handleModeChange = async (newMode: 'planned' | 'expected' | 'confirmed') => {
    if (!weddingId) return;
    
    try {
      const { error } = await supabase
        .from('weddings')
        .update({ calculation_mode: newMode })
        .eq('id', weddingId);
      
      if (error) throw error;
      
      setGlobalMode(newMode);
      
      const modeLabels = {
        planned: 'pianificati (target contrattuali)',
        expected: 'previsti (lista invitati - rifiutati)',
        confirmed: 'confermati (solo RSVP confermati)'
      };
      
      toast({
        title: 'Modalità aggiornata',
        description: `Ora stai visualizzando i dati ${modeLabels[newMode]}`
      });
    } catch (error) {
      console.error('Error updating calculation mode:', error);
      toast({
        title: 'Errore',
        description: 'Impossibile aggiornare la modalità',
        variant: 'destructive'
      });
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-indigo-600" />
          Gestione Spese e Pagamenti
        </CardTitle>
        <CalculationModeToggle
          value={globalMode}
          onValueChange={handleModeChange}
          breakdown={guestBreakdown}
          plannedCounts={weddingTargets}
        />
      </CardHeader>
      <CardContent>
        <ExpenseItemsManager 
          vendorId={vendorId} 
          categoryId={categoryId} 
          calculationMode={globalMode}
        />
      </CardContent>
    </Card>
  );
}
