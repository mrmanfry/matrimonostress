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
  HelpCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Guest {
  id: string;
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
  
  // Calculate funnel stats (couple members only count as confirmed)
  const stats = {
    // Draft: No STD sent, no formal invite sent (excludes couple)
    draft: regularGuests.filter(g => !g.save_the_date_sent_at && !g.formal_invite_sent_at).length,
    
    // Awareness: STD sent but no formal invite (excludes couple)
    std_sent: regularGuests.filter(g => g.save_the_date_sent_at && !g.formal_invite_sent_at).length,
    std_likely_yes: regularGuests.filter(g => g.save_the_date_sent_at && !g.formal_invite_sent_at && g.std_response === 'likely_yes').length,
    std_likely_no: regularGuests.filter(g => g.save_the_date_sent_at && !g.formal_invite_sent_at && g.std_response === 'likely_no').length,
    std_unsure: regularGuests.filter(g => g.save_the_date_sent_at && !g.formal_invite_sent_at && g.std_response === 'unsure').length,
    std_no_response: regularGuests.filter(g => g.save_the_date_sent_at && !g.formal_invite_sent_at && !g.std_response).length,
    
    // Invited: Formal invite sent but no RSVP response yet (excludes couple)
    invited: regularGuests.filter(g => g.formal_invite_sent_at && (!g.rsvp_status || g.rsvp_status === 'pending')).length,
    
    // Confirmed: includes couple members (always confirmed) + confirmed regular guests
    confirmed: coupleMembers.length + regularGuests.filter(g => g.rsvp_status === 'confirmed').length,
    
    // Declined (excludes couple)
    declined: regularGuests.filter(g => g.rsvp_status === 'declined').length,
  };

  const cards = [
    {
      id: 'draft',
      label: 'Da Lavorare',
      value: stats.draft,
      icon: FileText,
      color: 'text-slate-500',
      bgColor: 'bg-slate-100 dark:bg-slate-900/50',
      borderColor: 'border-slate-200 dark:border-slate-800',
      description: 'Non ancora contattati',
    },
    {
      id: 'std_sent',
      label: 'STD Inviato',
      value: stats.std_sent,
      icon: Calendar,
      color: 'text-violet-600',
      bgColor: 'bg-violet-50 dark:bg-violet-950/30',
      borderColor: 'border-violet-200 dark:border-violet-800',
      description: 'Fase awareness',
      subStats: stats.std_sent > 0 ? [
        { icon: ThumbsUp, value: stats.std_likely_yes, color: 'text-green-500' },
        { icon: HelpCircle, value: stats.std_unsure, color: 'text-amber-500' },
        { icon: ThumbsDown, value: stats.std_likely_no, color: 'text-red-500' },
      ] : undefined,
    },
    {
      id: 'invited',
      label: 'Invitati',
      value: stats.invited,
      icon: Mail,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-950/30',
      borderColor: 'border-blue-200 dark:border-blue-800',
      description: 'In attesa di RSVP',
    },
    {
      id: 'confirmed',
      label: 'Confermati',
      value: stats.confirmed,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50 dark:bg-green-950/30',
      borderColor: 'border-green-200 dark:border-green-800',
      description: 'Presenza confermata',
    },
    {
      id: 'declined',
      label: 'Rifiutati',
      value: stats.declined,
      icon: XCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50 dark:bg-red-950/30',
      borderColor: 'border-red-200 dark:border-red-800',
      description: 'Non partecipano',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {cards.map((card) => {
        const Icon = card.icon;
        const isActive = activeFilter === card.id;
        
        return (
          <Card 
            key={card.id}
            className={cn(
              "p-4 cursor-pointer transition-all duration-200",
              "hover:shadow-lg hover:-translate-y-0.5",
              card.bgColor,
              isActive && "ring-2 ring-primary ring-offset-2 shadow-lg -translate-y-0.5",
              card.borderColor
            )}
            onClick={() => onFilterChange?.(isActive ? null : card.id)}
          >
            <div className="flex items-start justify-between mb-2">
              <Icon className={cn("w-5 h-5", card.color)} />
              {isActive && (
                <Badge variant="secondary" className="text-[10px] h-5">
                  Attivo
                </Badge>
              )}
            </div>
            <div className={cn("text-2xl font-bold", card.color)}>
              {card.value}
            </div>
            <div className="text-xs font-medium text-foreground mt-1">
              {card.label}
            </div>
            <div className="text-[10px] text-muted-foreground">
              {card.description}
            </div>
            
            {/* Sub-stats for STD responses */}
            {card.subStats && card.subStats.some(s => s.value > 0) && (
              <div className="flex gap-2 mt-2 pt-2 border-t border-border/50">
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
        );
      })}
    </div>
  );
}
