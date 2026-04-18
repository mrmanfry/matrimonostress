import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Calendar, 
  Mail, 
  CheckCircle, 
  XCircle,
  ThumbsUp,
  ThumbsDown,
  HelpCircle,
  Clock,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getEffectiveStatus } from "@/lib/nucleusStatusHelper";

interface Guest {
  id: string;
  party_id?: string | null;
  phone?: string | null;
  save_the_date_sent_at?: string | null;
  formal_invite_sent_at?: string | null;
  std_response?: string | null;
  rsvp_status?: string | null;
  is_couple_member?: boolean;
}

interface FunnelKPICardsProps {
  guests: Guest[];
  activeFilter?: string | null;
  onFilterChange?: (filter: string | null) => void;
}

export function FunnelKPICards({ guests, activeFilter, onFilterChange }: FunnelKPICardsProps) {
  // Separate couple members (always confirmed) from regular guests
  const coupleMembers = guests.filter(g => g.is_couple_member);
  const regularGuests = guests.filter(g => !g.is_couple_member);
  
  // Calculate funnel stats using nucleus-aware logic
  // This ensures guests without phone inherit STD status from party members with phone
  const stats = {
    // Draft: No effective STD sent, no formal invite (excludes couple)
    draft: regularGuests.filter(g => {
      const status = getEffectiveStatus(g, guests);
      return !status.hasStdSent && !status.hasFormalInvite;
    }).length,
    
    // Awareness: Effective STD sent but no formal invite (excludes couple)
    std_sent: regularGuests.filter(g => {
      const status = getEffectiveStatus(g, guests);
      return status.hasStdSent && !status.hasFormalInvite;
    }).length,
    std_likely_yes: regularGuests.filter(g => {
      const status = getEffectiveStatus(g, guests);
      return status.hasStdSent && !status.hasFormalInvite && g.std_response === 'likely_yes';
    }).length,
    std_likely_no: regularGuests.filter(g => {
      const status = getEffectiveStatus(g, guests);
      return status.hasStdSent && !status.hasFormalInvite && g.std_response === 'likely_no';
    }).length,
    std_unsure: regularGuests.filter(g => {
      const status = getEffectiveStatus(g, guests);
      return status.hasStdSent && !status.hasFormalInvite && g.std_response === 'unsure';
    }).length,
    std_no_response: regularGuests.filter(g => {
      const status = getEffectiveStatus(g, guests);
      return status.hasStdSent && !status.hasFormalInvite && !g.std_response;
    }).length,
    
    // Invited: Effective formal invite but RSVP pending (excludes couple)
    invited: regularGuests.filter(g => {
      const status = getEffectiveStatus(g, guests);
      return status.hasFormalInvite && (!g.rsvp_status || g.rsvp_status === 'pending');
    }).length,
    
    // Confirmed: includes couple members (always confirmed) + confirmed regular guests
    confirmed: coupleMembers.length + regularGuests.filter(g => g.rsvp_status === 'confirmed').length,
    
    // Declined (excludes couple)
    declined: regularGuests.filter(g => g.rsvp_status === 'declined').length,
  };

  const cards = [
    {
      id: 'draft',
      label: 'Da Contattare',
      value: stats.draft,
      icon: FileText,
      color: 'text-slate-500',
      bgColor: 'bg-slate-100 dark:bg-slate-900/50',
      borderColor: 'border-slate-200 dark:border-slate-800',
    },
    {
      id: 'std_sent',
      label: 'Save the Date',
      value: stats.std_sent,
      icon: Calendar,
      color: 'text-violet-600',
      bgColor: 'bg-violet-50 dark:bg-violet-950/30',
      borderColor: 'border-violet-200 dark:border-violet-800',
      subStats: stats.std_sent > 0 ? [
        { icon: ThumbsUp, value: stats.std_likely_yes, color: 'text-green-500' },
        { icon: HelpCircle, value: stats.std_unsure, color: 'text-amber-500' },
        { icon: ThumbsDown, value: stats.std_likely_no, color: 'text-red-500' },
        { icon: Clock, value: stats.std_no_response, color: 'text-slate-400' },
      ] : undefined,
    },
    {
      id: 'invited',
      label: 'In Attesa Risposta',
      value: stats.invited,
      icon: Mail,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-950/30',
      borderColor: 'border-blue-200 dark:border-blue-800',
    },
    {
      id: 'confirmed',
      label: 'Confermati',
      value: stats.confirmed,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50 dark:bg-green-950/30',
      borderColor: 'border-green-200 dark:border-green-800',
    },
    {
      id: 'declined',
      label: 'Non Vengono',
      value: stats.declined,
      icon: XCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50 dark:bg-red-950/30',
      borderColor: 'border-red-200 dark:border-red-800',
    },
  ];

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2 text-xs text-muted-foreground">
        <span className="font-medium">Il tuo percorso inviti</span>
        <ChevronRight className="w-3 h-3 hidden md:block" />
      </div>
      <div className="flex gap-1 overflow-x-auto pb-2 -mx-3 px-3 snap-x snap-mandatory md:mx-0 md:px-0 md:overflow-visible md:gap-0 md:items-stretch scrollbar-hide">
        {cards.map((card, index) => {
          const Icon = card.icon;
          const isActive = activeFilter === card.id;
          
          return (
            <div key={card.id} className="flex items-center flex-shrink-0 md:flex-1">
              <Card 
                className={cn(
                  "p-2.5 md:p-4 cursor-pointer transition-all duration-200 flex-shrink-0 w-[105px] md:w-full snap-start",
                  "hover:shadow-lg hover:-translate-y-0.5",
                  card.bgColor,
                  isActive && "ring-2 ring-primary ring-offset-2 shadow-lg -translate-y-0.5",
                  card.borderColor
                )}
                onClick={() => onFilterChange?.(isActive ? null : card.id)}
              >
                <div className="flex items-start justify-between mb-1 md:mb-2">
                  <Icon className={cn("w-4 h-4 md:w-5 md:h-5", card.color)} />
                  {isActive && (
                    <Badge variant="secondary" className="text-[10px] h-4 md:h-5 px-1">
                      ✓
                    </Badge>
                  )}
                </div>
                <div className={cn("text-xl md:text-2xl font-bold", card.color)}>
                  {card.value}
                </div>
                <div className="text-[10px] md:text-xs font-medium text-foreground mt-0.5 md:mt-1 truncate">
                  {card.label}
                </div>
                
                {/* Sub-stats for STD responses */}
                {card.subStats && card.subStats.some(s => s.value > 0) && (
                  <div className="hidden md:flex gap-2 mt-2 pt-2 border-t border-border/50">
                    {card.subStats.map((sub, idx) => {
                      const SubIcon = sub.icon;
                      return sub.value > 0 ? (
                        <div key={idx} className="flex items-center gap-1">
                          <SubIcon className={cn("w-3 h-3", sub.color)} />
                          <span className="text-xs font-medium">{sub.value}</span>
                        </div>
                      ) : null;
                    })}
                  </div>
                )}
              </Card>
              {/* Arrow between cards - desktop only */}
              {index < cards.length - 1 && (
                <ChevronRight className="w-4 h-4 text-muted-foreground/40 mx-0.5 hidden md:block flex-shrink-0" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
