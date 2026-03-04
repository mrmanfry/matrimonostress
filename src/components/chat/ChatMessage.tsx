import { Lock, CheckCheck, Check, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

export interface ChatMessageData {
  id: string;
  content: string;
  sender_id: string;
  visibility: "couple" | "all";
  message_type: "user" | "system";
  system_action_type?: string | null;
  system_action_ref_id?: string | null;
  created_at: string;
  sender_name?: string;
  is_read?: boolean;
}

interface ChatMessageProps {
  message: ChatMessageData;
  isOwn: boolean;
  showSender?: boolean;
}

export function ChatMessage({ message, isOwn, showSender }: ChatMessageProps) {
  const navigate = useNavigate();

  // System message rendering
  if (message.message_type === "system") {
    return (
      <div className="flex justify-center my-3">
        <div
          className={cn(
            "bg-muted/30 border border-border rounded-xl px-4 py-2 max-w-[80%] text-center",
            message.system_action_ref_id && "cursor-pointer hover:bg-muted/50 transition-colors"
          )}
          onClick={() => {
            if (message.system_action_type === "task_created" && message.system_action_ref_id) {
              navigate(`/app/checklist?task_id=${message.system_action_ref_id}`);
            }
          }}
        >
          <p className="text-xs text-muted-foreground">{message.content}</p>
          {message.system_action_ref_id && (
            <span className="text-[10px] text-primary flex items-center gap-1 justify-center mt-1">
              <ExternalLink className="w-3 h-3" /> Vai al dettaglio
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex mb-2", isOwn ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[75%] rounded-2xl px-3.5 py-2 relative",
          isOwn
            ? "bg-primary text-primary-foreground rounded-br-md"
            : "bg-card border border-border rounded-bl-md",
          message.visibility === "couple" && "border-l-2 border-l-muted-foreground/30"
        )}
      >
        {showSender && !isOwn && message.sender_name && (
          <p className="text-xs font-semibold mb-0.5 text-primary/80">{message.sender_name}</p>
        )}
        <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
        <div className={cn("flex items-center gap-1 mt-1 justify-end", isOwn ? "text-primary-foreground/60" : "text-muted-foreground")}>
          {message.visibility === "couple" && <Lock className="w-2.5 h-2.5" />}
          <span className="text-[10px]">{format(new Date(message.created_at), "HH:mm", { locale: it })}</span>
          {isOwn && (
            message.is_read
              ? <CheckCheck className="w-3 h-3" />
              : <Check className="w-3 h-3" />
          )}
        </div>
      </div>
    </div>
  );
}
