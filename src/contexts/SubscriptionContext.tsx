import { createContext, useContext, ReactNode } from "react";
import { useSubscription } from "@/hooks/useSubscription";
import { toast } from "@/hooks/use-toast";

interface SubscriptionContextValue {
  status: "trialing" | "active" | "past_due" | "canceled" | "loading";
  daysLeft: number | null;
  isReadOnly: boolean;
  /** Call before any mutation. Returns true if allowed, shows toast if blocked. */
  guardAction: () => boolean;
}

const SubscriptionContext = createContext<SubscriptionContextValue | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const sub = useSubscription();

  const guardAction = (): boolean => {
    if (!sub.isReadOnly) return true;
    toast({
      title: "Funzionalità limitata",
      description: "Attiva il piano Premium per sbloccare questa funzione.",
      variant: "destructive",
    });
    return false;
  };

  return (
    <SubscriptionContext.Provider value={{ ...sub, guardAction }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscriptionContext() {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) {
    // Fallback for components outside provider (e.g. public pages)
    return {
      status: "active" as const,
      daysLeft: null,
      isReadOnly: false,
      guardAction: () => true,
    };
  }
  return ctx;
}
