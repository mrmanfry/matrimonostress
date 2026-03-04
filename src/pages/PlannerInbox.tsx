import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { InboxList, InboxItem } from "@/components/chat/InboxList";
import { ChatMessage, ChatMessageData } from "@/components/chat/ChatMessage";
import { ChatInput } from "@/components/chat/ChatInput";
import { Button } from "@/components/ui/button";
import { MessageCircle, ArrowLeft, ExternalLink } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { format, isToday, isYesterday } from "date-fns";
import { it } from "date-fns/locale";

const PAGE_SIZE = 50;

export default function PlannerInbox() {
  const { authState, switchWedding } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const userId = authState.status === "authenticated" ? authState.user.id : "";
  const weddings = authState.status === "authenticated" ? authState.weddings : [];

  const [inboxItems, setInboxItems] = useState<InboxItem[]>([]);
  const [selectedWeddingId, setSelectedWeddingId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Build inbox items from weddings
  useEffect(() => {
    const loadInbox = async () => {
      const weddingIds = weddings
        .filter(w => w.role === "planner" || w.role === "manager")
        .map(w => w.weddingId);

      if (weddingIds.length === 0) {
        setInboxItems([]);
        return;
      }

      // Get last message per wedding + unread counts
      const items: InboxItem[] = [];

      for (const wId of weddingIds) {
        const wedding = weddings.find(w => w.weddingId === wId)!;
        
        const { data: lastMsg } = await supabase
          .from("messages")
          .select("content, created_at")
          .eq("wedding_id", wId)
          .eq("visibility", "all")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        // Count unread: messages not read by this user
        const { count } = await supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("wedding_id", wId)
          .eq("visibility", "all")
          .neq("sender_id", userId)
          .not("id", "in", `(select message_id from message_reads where user_id = '${userId}')`);

        items.push({
          weddingId: wId,
          coupleNames: `${wedding.partner1Name} & ${wedding.partner2Name}`,
          weddingDate: wedding.weddingDate,
          lastMessage: lastMsg?.content,
          lastMessageAt: lastMsg?.created_at,
          unreadCount: count || 0,
        });
      }

      // Sort by last message
      items.sort((a, b) => {
        if (!a.lastMessageAt && !b.lastMessageAt) return 0;
        if (!a.lastMessageAt) return 1;
        if (!b.lastMessageAt) return -1;
        return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
      });

      setInboxItems(items);
    };

    loadInbox();
  }, [weddings, userId]);

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

  // Load messages for selected wedding
  const loadMessages = useCallback(async (weddingId: string) => {
    setLoadingMessages(true);
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("wedding_id", weddingId)
      .eq("visibility", "all")
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE);

    if (data) {
      const typed = (data as any[]).map(m => ({ ...m, visibility: m.visibility as "couple" | "all", message_type: m.message_type as "user" | "system" })) as ChatMessageData[];
      const enriched = await enrichWithNames(typed.reverse());
      setMessages(enriched);
    }
    setLoadingMessages(false);

    // Mark as read
    if (data && data.length > 0) {
      const unread = data.filter(m => m.sender_id !== userId);
      if (unread.length > 0) {
        const reads = unread.map(m => ({ message_id: m.id, user_id: userId }));
        await supabase.from("message_reads").upsert(reads, { onConflict: "message_id,user_id" });
      }
    }
  }, [userId]);

  useEffect(() => {
    if (selectedWeddingId) {
      loadMessages(selectedWeddingId);
    }
  }, [selectedWeddingId, loadMessages]);

  // Realtime for selected wedding
  useEffect(() => {
    if (!selectedWeddingId) return;
    const channel = supabase
      .channel(`inbox-${selectedWeddingId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `wedding_id=eq.${selectedWeddingId}`,
      }, (payload) => {
        const raw = payload.new as any;
        const newMsg: ChatMessageData = { ...raw, visibility: raw.visibility as "couple" | "all", message_type: raw.message_type as "user" | "system" };
        if (newMsg.visibility !== "all") return; // Planner can't see couple messages
        setMessages(prev => {
          if (prev.some(m => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
        if (newMsg.sender_id !== userId) {
          supabase.from("message_reads").insert({ message_id: newMsg.id, user_id: userId }).then(() => {});
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedWeddingId, userId]);

  const handleSend = async (content: string) => {
    if (!selectedWeddingId || !userId) return;

    const optimisticMsg: ChatMessageData = {
      id: crypto.randomUUID(),
      content,
      sender_id: userId,
      visibility: "all",
      message_type: "user",
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimisticMsg]);

    const { error } = await supabase.from("messages").insert({
      wedding_id: selectedWeddingId,
      sender_id: userId,
      content,
      visibility: "all",
      message_type: "user",
    });

    if (error) {
      setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
    }
  };

  const handleGoToWedding = () => {
    if (!selectedWeddingId) return;
    switchWedding(selectedWeddingId);
    navigate("/app/dashboard");
  };

  const selectedCouple = inboxItems.find(i => i.weddingId === selectedWeddingId);

  // Date separator
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

  // Mobile drill-down: show thread full screen
  if (isMobile && selectedWeddingId) {
    let lastDateKey = "";
    return (
      <div className="flex flex-col h-[calc(100vh-3.5rem)]">
        {/* Header */}
        <div className="flex items-center gap-3 p-3 border-b border-border bg-card">
          <Button variant="ghost" size="icon" onClick={() => setSelectedWeddingId(null)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{selectedCouple?.coupleNames}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={handleGoToWedding}>
            <ExternalLink className="w-4 h-4" />
          </Button>
        </div>
        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {messages.map((msg) => {
            const dateKey = format(new Date(msg.created_at), "yyyy-MM-dd");
            const showDate = dateKey !== lastDateKey;
            lastDateKey = dateKey;
            return (
              <div key={msg.id}>
                {showDate && renderDateSeparator(msg.created_at)}
                <ChatMessage message={msg} isOwn={msg.sender_id === userId} showSender />
              </div>
            );
          })}
        </div>
        <ChatInput onSend={(c) => handleSend(c)} showVisibilityToggle={false} />
      </div>
    );
  }

  // Mobile: show only inbox list (no right pane)
  if (isMobile) {
    return (
      <div className="flex flex-col h-[calc(100vh-3.5rem)]">
        <div className="p-3 border-b border-border bg-card">
          <h2 className="font-serif font-semibold text-sm flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-primary" /> Messaggi
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          <InboxList items={inboxItems} selectedWeddingId={selectedWeddingId} onSelect={setSelectedWeddingId} />
        </div>
      </div>
    );
  }

  // Desktop: two columns
  let lastDateKey = "";
  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      {/* Left: inbox list */}
      <div className="w-80 border-r border-border bg-card overflow-y-auto shrink-0">
        <div className="p-3 border-b border-border">
          <h2 className="font-serif font-semibold text-sm flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-primary" /> Messaggi
          </h2>
        </div>
        <InboxList items={inboxItems} selectedWeddingId={selectedWeddingId} onSelect={setSelectedWeddingId} />
      </div>

      {/* Right: thread */}
      <div className="flex-1 flex flex-col min-w-0">
        {!selectedWeddingId ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
            Seleziona una conversazione
          </div>
        ) : (
          <>
            {/* Thread header */}
            <div className="flex items-center justify-between p-3 border-b border-border bg-card">
              <p className="font-semibold text-sm">{selectedCouple?.coupleNames}</p>
              <Button variant="outline" size="sm" onClick={handleGoToWedding}>
                <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Vai al matrimonio
              </Button>
            </div>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3">
              {loadingMessages ? (
                <div className="flex items-center justify-center h-full">
                  <MessageCircle className="w-8 h-8 text-muted-foreground animate-pulse" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <MessageCircle className="w-12 h-12 text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">Nessun messaggio ancora.</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const dateKey = format(new Date(msg.created_at), "yyyy-MM-dd");
                  const showDate = dateKey !== lastDateKey;
                  lastDateKey = dateKey;
                  return (
                    <div key={msg.id}>
                      {showDate && renderDateSeparator(msg.created_at)}
                      <ChatMessage message={msg} isOwn={msg.sender_id === userId} showSender />
                    </div>
                  );
                })
              )}
            </div>
            <ChatInput onSend={(c) => handleSend(c)} showVisibilityToggle={false} />
          </>
        )}
      </div>
    </div>
  );
}
