import { useState, useRef, KeyboardEvent } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { VisibilityToggle } from "./VisibilityToggle";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSend: (content: string, visibility: "couple" | "all") => void;
  disabled?: boolean;
  plannerName?: string;
  showVisibilityToggle?: boolean;
}

export function ChatInput({ onSend, disabled, plannerName, showVisibilityToggle = true }: ChatInputProps) {
  const [content, setContent] = useState("");
  const [visibility, setVisibility] = useState<"couple" | "all">("all");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    const trimmed = content.trim();
    if (!trimmed) return;
    onSend(trimmed, visibility);
    setContent("");
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t border-border bg-card p-3 space-y-2">
      {showVisibilityToggle && (
        <VisibilityToggle visibility={visibility} onChange={setVisibility} plannerName={plannerName} />
      )}
      <div className={cn(
        "flex items-end gap-2 rounded-xl p-1.5 transition-colors",
        visibility === "couple" ? "bg-muted/20" : "bg-primary/5 ring-1 ring-primary/20"
      )}>
        <Textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            visibility === "all"
              ? plannerName ? `Scrivi a ${plannerName}...` : "Scrivi un messaggio..."
              : "Messaggio privato tra voi..."
          }
          disabled={disabled}
          className="min-h-[40px] max-h-[120px] resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-sm"
          rows={1}
        />
        <Button
          size="icon"
          onClick={handleSend}
          disabled={disabled || !content.trim()}
          className="shrink-0 rounded-xl h-9 w-9"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
