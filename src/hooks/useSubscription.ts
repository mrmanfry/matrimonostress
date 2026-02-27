import { useState, useEffect, createContext, useContext } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface SubscriptionState {
  status: "trialing" | "active" | "past_due" | "canceled" | "loading";
  daysLeft: number | null;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  isReadOnly: boolean;
}

const defaultState: SubscriptionState = {
  status: "loading",
  daysLeft: null,
  trialEndsAt: null,
  currentPeriodEnd: null,
  isReadOnly: false,
};

export function useSubscription(): SubscriptionState {
  const { authState } = useAuth();
  const [state, setState] = useState<SubscriptionState>(defaultState);

  useEffect(() => {
    if (authState.status !== "authenticated" || !authState.weddingId) {
      setState({ ...defaultState, status: "loading" });
      return;
    }

    const weddingId = authState.weddingId;

    const load = async () => {
      const { data } = await supabase
        .from("weddings")
        .select("subscription_status, trial_ends_at, current_period_end")
        .eq("id", weddingId)
        .maybeSingle();

      if (!data) {
        setState({ ...defaultState, status: "trialing" });
        return;
      }

      const subStatus = (data.subscription_status || "trialing") as SubscriptionState["status"];
      const trialEndsAt = data.trial_ends_at;
      const currentPeriodEnd = data.current_period_end;

      let daysLeft: number | null = null;
      let isReadOnly = false;

      if (subStatus === "trialing" && trialEndsAt) {
        const now = new Date();
        const end = new Date(trialEndsAt);
        daysLeft = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
        if (daysLeft <= 0) {
          isReadOnly = true;
        }
      } else if (subStatus === "canceled" || subStatus === "past_due") {
        isReadOnly = true;
        daysLeft = 0;
      }
      // active => isReadOnly stays false

      setState({
        status: subStatus,
        daysLeft,
        trialEndsAt,
        currentPeriodEnd,
        isReadOnly,
      });
    };

    load();
  }, [authState]);

  return state;
}
