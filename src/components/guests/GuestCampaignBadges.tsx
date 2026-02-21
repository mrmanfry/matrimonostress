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
  ultraCompact?: boolean;
}

export function GuestCampaignBadges({
  saveTheDateSentAt,
  formalInviteSentAt,
  stdResponse,
  rsvpStatus,
  stdRespondedBy,
  compact = false,
  ultraCompact = false,
}: GuestCampaignBadgesProps) {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("it-IT", {
      day: "numeric",
      month: "short",
    });
  };

  // Ultra compact: single colored dot
  if (ultraCompact) {
    let dotColor = "bg-slate-300 dark:bg-slate-600"; // draft
    let label = "Da invitare";

    if (rsvpStatus === 'confirmed') {
      dotColor = "bg-green-500";
      label = "Confermato";
    } else if (rsvpStatus === 'declined') {
      dotColor = "bg-red-500";
      label = "Rifiutato";
    } else if (formalInviteSentAt) {
      dotColor = "bg-blue-500";
      label = "Invito inviato";
    } else if (saveTheDateSentAt || stdResponse) {
      if (stdResponse === 'likely_yes') {
        dotColor = "bg-green-400";
        label = "STD: Interessato";
      } else if (stdResponse === 'likely_no') {
        dotColor = "bg-orange-400";
        label = "STD: Improbabile";
      } else if (stdResponse === 'unsure') {
        dotColor = "bg-amber-400";
        label = "STD: Incerto";
      } else {
        dotColor = "bg-violet-400";
        label = "STD inviato";
      }
    }

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className={cn("inline-block w-2 h-2 rounded-full flex-shrink-0", dotColor)} />
          </TooltipTrigger>
          <TooltipContent><p className="text-xs">{label}</p></TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Standard and compact modes (unchanged logic)
  const badges: JSX.Element[] = [];

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
          <TooltipContent><p>Presenza confermata</p></TooltipContent>
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
          <TooltipContent><p>Non partecipa</p></TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
    return <div className="flex flex-wrap gap-1">{badges}</div>;
  }

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

  if (stdResponse && !formalInviteSentAt) {
    const responseConfig = {
      likely_yes: {
        icon: ThumbsUp, label: "Interessato", shortLabel: "👍",
        color: "border-green-300 bg-green-50 text-green-700 dark:border-green-700 dark:bg-green-950/30 dark:text-green-400",
      },
      unsure: {
        icon: HelpCircle, label: "Incerto", shortLabel: "🤔",
        color: "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-400",
      },
      likely_no: {
        icon: ThumbsDown, label: "Improbabile", shortLabel: "👎",
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
          <TooltipContent><p>Nessun messaggio inviato</p></TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (badges.length === 0) return null;

  return <div className="flex flex-wrap gap-1">{badges}</div>;
}
