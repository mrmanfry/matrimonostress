import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { 
  Calendar, 
  Mail, 
  CheckCircle, 
  XCircle, 
  ThumbsUp, 
  ThumbsDown,
  HelpCircle,
  Clock
} from "lucide-react";
import { cn } from "@/lib/utils";

interface GuestCampaignBadgesProps {
  saveTheDateSentAt?: string | null;
  formalInviteSentAt?: string | null;
  stdResponse?: 'likely_yes' | 'likely_no' | 'unsure' | null;
  rsvpStatus?: string | null;
  stdRespondedBy?: string | null;
  compact?: boolean;
}

export function GuestCampaignBadges({
  saveTheDateSentAt,
  formalInviteSentAt,
  stdResponse,
  rsvpStatus,
  stdRespondedBy,
  compact = false,
}: GuestCampaignBadgesProps) {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("it-IT", {
      day: "numeric",
      month: "short",
    });
  };

  // Determine the "winning" badge based on priority matrix
  // 1. RSVP Confirmed/Declined wins over everything
  // 2. Formal invite sent
  // 3. STD sent with response
  // 4. Draft (nothing sent)

  const badges: JSX.Element[] = [];

  // RSVP Status (highest priority)
  if (rsvpStatus === 'confirmed') {
    badges.push(
      <TooltipProvider key="confirmed">
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="default" className={cn(
              "bg-green-600 hover:bg-green-700",
              compact && "h-5 text-[10px] px-1.5"
            )}>
              <CheckCircle className={cn("mr-1", compact ? "w-3 h-3" : "w-3.5 h-3.5")} />
              {compact ? "✓" : "Confermato"}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>Presenza confermata</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
    return <div className="flex flex-wrap gap-1">{badges}</div>;
  }

  if (rsvpStatus === 'declined') {
    badges.push(
      <TooltipProvider key="declined">
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="destructive" className={cn(compact && "h-5 text-[10px] px-1.5")}>
              <XCircle className={cn("mr-1", compact ? "w-3 h-3" : "w-3.5 h-3.5")} />
              {compact ? "✗" : "Rifiutato"}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>Non partecipa</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
    return <div className="flex flex-wrap gap-1">{badges}</div>;
  }

  // Formal Invite Sent
  if (formalInviteSentAt) {
    badges.push(
      <TooltipProvider key="formal">
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className={cn(
              "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-950/30 dark:text-blue-400",
              compact && "h-5 text-[10px] px-1.5"
            )}>
              <Mail className={cn("mr-1", compact ? "w-3 h-3" : "w-3.5 h-3.5")} />
              {compact ? "📨" : "Invito Inviato"}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>Invito ufficiale inviato il {formatDate(formalInviteSentAt)}</p>
            <p className="text-xs text-muted-foreground">In attesa di risposta</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Save The Date Sent (only show if no formal invite yet)
  if (saveTheDateSentAt && !formalInviteSentAt) {
    badges.push(
      <TooltipProvider key="std">
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className={cn(
              "border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-700 dark:bg-violet-950/30 dark:text-violet-400",
              compact && "h-5 text-[10px] px-1.5"
            )}>
              <Calendar className={cn("mr-1", compact ? "w-3 h-3" : "w-3.5 h-3.5")} />
              {compact ? "📅" : "STD Inviato"}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>Save The Date inviato il {formatDate(saveTheDateSentAt)}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // STD Response badge - show even if saveTheDateSentAt is null (fix for responses without recorded send)
  if (stdResponse && !formalInviteSentAt) {
    const responseConfig = {
      likely_yes: {
        icon: ThumbsUp,
        label: "Interessato",
        shortLabel: "👍",
        color: "border-green-300 bg-green-50 text-green-700 dark:border-green-700 dark:bg-green-950/30 dark:text-green-400",
      },
      unsure: {
        icon: HelpCircle,
        label: "Incerto",
        shortLabel: "🤔",
        color: "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-400",
      },
      likely_no: {
        icon: ThumbsDown,
        label: "Improbabile",
        shortLabel: "👎",
        color: "border-red-300 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-950/30 dark:text-red-400",
      },
    }[stdResponse];

    const ResponseIcon = responseConfig.icon;
    
    badges.push(
      <TooltipProvider key="std-response">
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className={cn(responseConfig.color, compact && "h-5 text-[10px] px-1.5")}>
              <ResponseIcon className={cn("mr-1", compact ? "w-3 h-3" : "w-3.5 h-3.5")} />
              {compact ? responseConfig.shortLabel : responseConfig.label}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>Risposta al Save The Date: {responseConfig.label}</p>
            {stdRespondedBy && (
              <p className="text-xs text-muted-foreground">Risposto da: {stdRespondedBy}</p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // If nothing sent, show "Da Invitare" badge
  if (!saveTheDateSentAt && !formalInviteSentAt) {
    badges.push(
      <TooltipProvider key="draft">
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className={cn(
              "border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-950/30 dark:text-slate-400",
              compact && "h-5 text-[10px] px-1.5"
            )}>
              <Clock className={cn("mr-1", compact ? "w-3 h-3" : "w-3.5 h-3.5")} />
              {compact ? "⚪" : "Da Invitare"}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>Nessun messaggio inviato</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (badges.length === 0) return null;

  return <div className="flex flex-wrap gap-1">{badges}</div>;
}
