import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type PlannerTier = "solo" | "studio" | "agency" | "enterprise";

export interface PlannerSubscriptionState {
  loading: boolean;
  hasSubscription: boolean;
  tier: PlannerTier | null;
  status: "trialing" | "active" | "past_due" | "canceled" | "loading";
  slotLimit: number;
  slotsUsed: number;
  slotsAvailable: number;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  isReadOnly: boolean;
  refresh: () => Promise<void>;
}

const defaultState: PlannerSubscriptionState = {
  loading: true,
  hasSubscription: false,
  tier: null,
  status: "loading",
  slotLimit: 0,
  slotsUsed: 0,
  slotsAvailable: 0,
  trialEndsAt: null,
  currentPeriodEnd: null,
  isReadOnly: false,
  refresh: async () => {},
};

export function usePlannerSubscription(): PlannerSubscriptionState {
  const { authState } = useAuth();
  const [state, setState] = useState<PlannerSubscriptionState>(defaultState);

  const userId = authState.status === "authenticated" ? authState.user.id : null;

  const load = useCallback(async () => {
    if (!userId) {
      setState({ ...defaultState, loading: false });
      return;
    }

    const [{ data: sub }, { data: count }] = await Promise.all([
      supabase
        .from("planner_subscriptions")
        .select("tier, slot_limit, subscription_status, trial_ends_at, current_period_end")
        .eq("user_id", userId)
        .maybeSingle(),
      supabase.rpc("count_active_planner_weddings", { p_user_id: userId }),
    ]);

    const slotsUsed = (count as number) || 0;
    if (!sub) {
      setState({
        ...defaultState,
        loading: false,
        slotsUsed,
        refresh: load,
      });
      return;
    }

    const status = (sub.subscription_status || "trialing") as PlannerSubscriptionState["status"];
    const slotLimit = sub.slot_limit || 0;

    let isReadOnly = false;
    if (status === "trialing" && sub.trial_ends_at) {
      if (new Date(sub.trial_ends_at).getTime() < Date.now()) isReadOnly = true;
    } else if (status === "canceled" || status === "past_due") {
      isReadOnly = true;
    }

    setState({
      loading: false,
      hasSubscription: true,
      tier: (sub.tier as PlannerTier) || null,
      status,
      slotLimit,
      slotsUsed,
      slotsAvailable: Math.max(0, slotLimit - slotsUsed),
      trialEndsAt: sub.trial_ends_at,
      currentPeriodEnd: sub.current_period_end,
      isReadOnly,
      refresh: load,
    });
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, refresh: load };
}
