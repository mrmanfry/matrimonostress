import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ChatMessage, ChatMessageData } from "@/components/chat/ChatMessage";
import { ChatInput } from "@/components/chat/ChatInput";
import { MessageCircle } from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import { it } from "date-fns/locale";

const PAGE_SIZE = 50;

export default function Chat() {
  const { authState } = useAuth();
  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [plannerName, setPlannerName] = useState<string | undefined>();
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const userId = authState.status === "authenticated" ? authState.user.id : "";
  const weddingId = authState.status === "authenticated" ? authState.activeWeddingId : "";

  // Load planner name for this wedding
  useEffect(() => {
    if (!weddingId) return;
    const loadPlanner = async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("wedding_id", weddingId)
        .eq("role", "planner")
        .limit(1)
        .maybeSingle();
      if (data?.user_id) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("first_name, last_name")
          .eq("id", data.user_id)
          .single();
        if (profile) {
          setPlannerName([profile.first_name, profile.last_name].filter(Boolean).join(" ") || undefined);
        }
      }
    };
    loadPlanner();
  }, [weddingId]);

  // Profile name cache
  const [profileNames, setProfileNames] = useState<Record<string, string>>({});

  const enrichWithNames = useCallback(async (msgs: ChatMessageData[]) => {
    const unknownIds = [...new Set(msgs.map(m => m.sender_id))].filter(id => !profileNames[id]);
    if (unknownIds.length === 0) {
      return msgs.map(m => ({ ...m, sender_name: profileNames[m.sender_id] || undefined }));
    }
    const { data: names } = await supabase.rpc("get_display_names", { user_ids: unknownIds });
    const newNames: Record<string, string> = { ...profileNames };
    if (names) {
      for (const n of names as any[]) {
        if (n.display_name?.trim()) newNames[n.id] = n.display_name.trim();
      }
    }
    setProfileNames(newNames);
    return msgs.map(m => ({ ...m, sender_name: newNames[m.sender_id] || undefined }));
  }, [profileNames]);

  // Load messages
  const loadMessages = useCallback(async (before?: string) => {
    if (!weddingId) return;
    let query = supabase
      .from("messages")
      .select("*")
      .eq("wedding_id", weddingId)
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE);

    if (before) {
      query = query.lt("created_at", before);
    }

    const { data } = await query;
    if (data) {
      const typed = (data as any[]).map(m => ({ ...m, visibility: m.visibility as "couple" | "all", message_type: m.message_type as "user" | "system" })) as ChatMessageData[];
      const reversed = typed.reverse();
      const enriched = await enrichWithNames(reversed);
      if (!before) {
        setMessages(enriched);
      } else {
        setMessages(prev => [...(enriched), ...prev]);
      }
      setHasMore(data.length === PAGE_SIZE);
    }
    setLoading(false);
  }, [weddingId, enrichWithNames]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // Realtime subscription
  useEffect(() => {
    if (!weddingId) return;
    const channel = supabase
      .channel(`chat-${weddingId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `wedding_id=eq.${weddingId}`,
      }, (payload) => {
        const raw = payload.new as any;
        const newMsg: ChatMessageData = { ...raw, visibility: raw.visibility as "couple" | "all", message_type: raw.message_type as "user" | "system" };
        setMessages(prev => {
          if (prev.some(m => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
        // Mark as read if not own message
        if (newMsg.sender_id !== userId) {
          supabase.from("message_reads").insert({
            message_id: newMsg.id,
            user_id: userId,
          }).then(() => {});
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [weddingId, userId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // Mark visible messages as read on mount
  useEffect(() => {
    if (!userId || messages.length === 0) return;
    const unread = messages.filter(m => m.sender_id !== userId);
    if (unread.length > 0) {
      const reads = unread.map(m => ({ message_id: m.id, user_id: userId }));
      supabase.from("message_reads").upsert(reads, { onConflict: "message_id,user_id" }).then(() => {});
    }
  }, [messages, userId]);

  const handleSend = async (content: string, visibility: "couple" | "all") => {
    if (!weddingId || !userId) return;

    const optimisticMsg: ChatMessageData = {
      id: crypto.randomUUID(),
      content,
      sender_id: userId,
      visibility,
      message_type: "user",
      created_at: new Date().toISOString(),
      is_read: false,
    };

    setMessages(prev => [...prev, optimisticMsg]);

    const { error } = await supabase.from("messages").insert({
      wedding_id: weddingId,
      sender_id: userId,
      content,
      visibility,
      message_type: "user",
    });

    if (error) {
      setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
    } else {
      // Fire-and-forget email notification
      supabase.functions.invoke("notify-chat-message", {
        body: { wedding_id: weddingId, sender_id: userId, content, visibility },
      });
    }
  };

  // Group messages by date
  const renderDateSeparator = (dateStr: string) => {
    const date = new Date(dateStr);
    let label: string;
    if (isToday(date)) label = "Oggi";
    else if (isYesterday(date)) label = "Ieri";
    else label = format(date, "d MMMM yyyy", { locale: it });

    return (
      <div className="flex items-center gap-3 my-3">
        <div className="flex-1 h-px bg-border" />
        <span className="text-[10px] text-muted-foreground font-medium">{label}</span>
        <div className="flex-1 h-px bg-border" />
      </div>
    );
  };

  // Determine if current user is co_planner (show visibility toggle)
  const isCoPlanner = authState.status === "authenticated" && authState.activeRole === "co_planner";

  const handleScroll = () => {
    if (!scrollRef.current || !hasMore) return;
    if (scrollRef.current.scrollTop === 0 && messages.length > 0) {
      loadMessages(messages[0].created_at);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <MessageCircle className="w-8 h-8 text-muted-foreground animate-pulse" />
      </div>
    );
  }

  let lastDateKey = "";

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      {/* Messages area */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-3"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <MessageCircle className="w-12 h-12 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">Nessun messaggio ancora.</p>
            <p className="text-xs text-muted-foreground mt-1">Inizia la conversazione!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const dateKey = format(new Date(msg.created_at), "yyyy-MM-dd");
            const showDate = dateKey !== lastDateKey;
            lastDateKey = dateKey;

            return (
              <div key={msg.id}>
                {showDate && renderDateSeparator(msg.created_at)}
                <ChatMessage
                  message={msg}
                  isOwn={msg.sender_id === userId}
                  showSender={msg.sender_id !== userId}
                />
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <ChatInput
        onSend={handleSend}
        plannerName={plannerName}
        showVisibilityToggle={isCoPlanner}
      />
    </div>
  );
}
