import { useState } from "react";
import { useAuth, WeddingContext } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Heart, ChevronsUpDown, Check, Plus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { JoinWeddingDialog } from "./JoinWeddingDialog";

export function WorkspaceSwitcher() {
  const { authState, switchWedding, activeMode } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [joinOpen, setJoinOpen] = useState(false);

  if (authState.status !== "authenticated") {
    return null;
  }

  // Filter weddings based on active mode
  const filteredWeddings = authState.weddings.filter(w => {
    if (activeMode === 'planner') {
      return w.role === 'planner' || w.role === 'manager';
    }
    // couple mode: show own weddings (co_planner, or non-planner roles)
    return w.role !== 'planner';
  });

  const active = authState.weddings.find(w => w.weddingId === authState.activeWeddingId);
  const showSwitcher = filteredWeddings.length > 1 || activeMode === 'planner';

  const handleSwitch = (wedding: WeddingContext) => {
    if (wedding.weddingId === authState.activeWeddingId) return;
    switchWedding(wedding.weddingId);
    queryClient.invalidateQueries();
    navigate("/app/dashboard");
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 w-full p-2 rounded-lg hover:bg-accent/10 transition-colors text-left">
            <div className="relative p-2 rounded-xl bg-accent/10 border border-accent/15 shrink-0">
              <Heart className="w-4 h-4 text-accent fill-accent/70" />
            </div>
            <div className="flex-1 overflow-hidden min-w-0">
              <p className="font-serif font-bold text-xs tracking-wider truncate leading-none">
                {active ? `${active.partner1Name} & ${active.partner2Name}` : 'WedsApp'}
              </p>
              <p className="text-muted-foreground text-[9px] font-medium tracking-[0.15em] uppercase leading-none mt-0.5 truncate">
                {activeMode === 'planner' ? 'Planner Mode' : 'Wedding Planner'}
              </p>
            </div>
            {showSwitcher && (
              <ChevronsUpDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          {filteredWeddings.map((wedding) => (
            <DropdownMenuItem
              key={wedding.weddingId}
              onClick={() => handleSwitch(wedding)}
              className="flex items-center gap-2 cursor-pointer"
            >
              <Heart className="w-3.5 h-3.5 text-accent fill-accent/50 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {wedding.partner1Name} & {wedding.partner2Name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(wedding.weddingDate).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })}
                  {wedding.role === 'planner' && ' · Planner'}
                </p>
              </div>
              {wedding.weddingId === authState.activeWeddingId && (
                <Check className="w-4 h-4 text-accent shrink-0" />
              )}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setJoinOpen(true)}
            className="flex items-center gap-2 cursor-pointer text-muted-foreground"
          >
            <Plus className="w-3.5 h-3.5 shrink-0" />
            <span className="text-sm">Unisciti con codice</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <JoinWeddingDialog open={joinOpen} onOpenChange={setJoinOpen} />
    </>
  );
}
