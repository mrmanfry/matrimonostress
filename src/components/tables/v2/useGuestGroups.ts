import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { buildGroupColorMap } from "./groupColors";
import type { GuestGroupV2 } from "./types";

export function useGuestGroups(weddingId: string | null) {
  const [groups, setGroups] = useState<GuestGroupV2[]>([]);

  useEffect(() => {
    if (!weddingId) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("guest_groups")
        .select("id, name")
        .eq("wedding_id", weddingId)
        .order("name");
      if (!cancelled && data) setGroups(data);
    })();
    return () => {
      cancelled = true;
    };
  }, [weddingId]);

  const groupColorMap = useMemo(
    () => buildGroupColorMap(groups.map((g) => g.id)),
    [groups]
  );

  return { groups, groupColorMap };
}
