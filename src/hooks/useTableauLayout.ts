import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { TableauStyle, TableauBlockPosition } from "@/lib/tableauGeneratorEngine";

export interface TableauLayoutRow {
  id: string;
  wedding_id: string;
  background_path: string | null;
  width_cm: number;
  height_cm: number;
  orientation: string;
  style: Partial<TableauStyle> & { lastExportHash?: string };
  blocks: Record<string, TableauBlockPosition>;
  status: "draft" | "frozen";
  updated_at: string;
}

export const DEFAULT_STYLE: TableauStyle = {
  fontFamily: "cormorant",
  fontColor: "#2b2118",
  baseFontSize: 12,
  textAlign: "center",
  displayMode: "full",
};

export function useTableauLayout(weddingId: string | null) {
  const [layout, setLayout] = useState<TableauLayoutRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const debounceRef = useRef<number | null>(null);
  const pendingRef = useRef<Partial<TableauLayoutRow> | null>(null);

  const fetchLayout = useCallback(async () => {
    if (!weddingId) return;
    setLoading(true);
    const { data } = await (supabase as any)
      .from("tableau_layouts")
      .select("*")
      .eq("wedding_id", weddingId)
      .maybeSingle();
    setLayout(data ?? null);
    setLoading(false);
  }, [weddingId]);

  useEffect(() => {
    fetchLayout();
  }, [fetchLayout]);

  const createLayout = useCallback(
    async (payload: Partial<TableauLayoutRow>) => {
      if (!weddingId) return null;
      const insert = {
        wedding_id: weddingId,
        style: { ...DEFAULT_STYLE, ...(payload.style ?? {}) },
        blocks: {},
        status: "draft",
        ...payload,
      };
      const { data, error } = await (supabase as any)
        .from("tableau_layouts")
        .insert(insert)
        .select()
        .single();
      if (error) throw error;
      setLayout(data);
      return data as TableauLayoutRow;
    },
    [weddingId],
  );

  const flush = useCallback(async () => {
    if (!layout || !pendingRef.current) return;
    const patch = pendingRef.current;
    pendingRef.current = null;
    setSaving(true);
    const { data, error } = await (supabase as any)
      .from("tableau_layouts")
      .update(patch)
      .eq("id", layout.id)
      .select()
      .single();
    setSaving(false);
    if (!error && data) {
      setLayout(data);
      setSavedAt(Date.now());
    }
  }, [layout]);

  const patch = useCallback(
    (partial: Partial<TableauLayoutRow>) => {
      if (!layout) return;
      setLayout((prev) => (prev ? { ...prev, ...partial } : prev));
      pendingRef.current = { ...(pendingRef.current ?? {}), ...partial };
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      debounceRef.current = window.setTimeout(() => {
        flush();
      }, 800);
    },
    [layout, flush],
  );

  const patchImmediate = useCallback(
    async (partial: Partial<TableauLayoutRow>) => {
      if (!layout) return;
      const { data, error } = await (supabase as any)
        .from("tableau_layouts")
        .update(partial)
        .eq("id", layout.id)
        .select()
        .single();
      if (!error && data) {
        setLayout(data);
        setSavedAt(Date.now());
      }
    },
    [layout],
  );

  return { layout, loading, saving, savedAt, createLayout, patch, patchImmediate, refetch: fetchLayout };
}
