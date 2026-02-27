import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Heart, User } from "lucide-react";

/**
 * ModeSwitcher – Airbnb-style toggle between "Sposo" and "Planner" modes.
 * Only visible when the user has both couple AND planner personas.
 */
export function ModeSwitcher() {
  const { hasMultiplePersonas, activeMode, switchMode } = useAuth();
  const navigate = useNavigate();

  if (!hasMultiplePersonas) return null;

  const handleSwitch = (mode: 'couple' | 'planner') => {
    if (mode === activeMode) return;
    switchMode(mode);
    navigate(mode === 'planner' ? '/app/planner' : '/app/dashboard', { replace: true });
  };

  return (
    <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/50 border border-border">
      <button
        onClick={() => handleSwitch('couple')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
          activeMode === 'couple'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        <Heart className="w-3 h-3" />
        <span>Sposo</span>
      </button>
      <button
        onClick={() => handleSwitch('planner')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
          activeMode === 'planner'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        <User className="w-3 h-3" />
        <span>Planner</span>
      </button>
    </div>
  );
}
