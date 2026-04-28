import { useCallback, useMemo, useRef, useState } from "react";
import type {
  InvitationBlock,
  InvitationPageSchema,
  BlockStyleOverride,
} from "@/lib/invitationBlocks/types";

interface HistoryState {
  past: InvitationPageSchema[];
  present: InvitationPageSchema;
  future: InvitationPageSchema[];
}

const MAX_HISTORY = 50;

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v));
}

export function useInvitationPageEditor(initial: InvitationPageSchema) {
  const [state, setState] = useState<HistoryState>(() => ({
    past: [],
    present: clone(initial),
    future: [],
  }));
  // selected block id (UI state)
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const initialRef = useRef(initial);

  const commit = useCallback((updater: (p: InvitationPageSchema) => InvitationPageSchema) => {
    setState((s) => {
      const next = updater(clone(s.present));
      const past = [...s.past, s.present].slice(-MAX_HISTORY);
      return { past, present: next, future: [] };
    });
  }, []);

  const undo = useCallback(() => {
    setState((s) => {
      if (!s.past.length) return s;
      const previous = s.past[s.past.length - 1];
      const past = s.past.slice(0, -1);
      return { past, present: previous, future: [s.present, ...s.future].slice(0, MAX_HISTORY) };
    });
  }, []);

  const redo = useCallback(() => {
    setState((s) => {
      if (!s.future.length) return s;
      const next = s.future[0];
      const future = s.future.slice(1);
      return { past: [...s.past, s.present].slice(-MAX_HISTORY), present: next, future };
    });
  }, []);

  const reset = useCallback((next: InvitationPageSchema) => {
    initialRef.current = next;
    setState({ past: [], present: clone(next), future: [] });
  }, []);

  // Block ops
  const addBlock = useCallback(
    (block: InvitationBlock, atIndex?: number) => {
      commit((p) => {
        const blocks = [...p.blocks];
        if (typeof atIndex === "number") blocks.splice(atIndex, 0, block);
        else blocks.push(block);
        return { ...p, blocks };
      });
      setSelectedId(block.id);
    },
    [commit]
  );

  const removeBlock = useCallback(
    (id: string) => {
      commit((p) => ({ ...p, blocks: p.blocks.filter((b) => b.id !== id) }));
      setSelectedId((cur) => (cur === id ? null : cur));
    },
    [commit]
  );

  const duplicateBlock = useCallback(
    (id: string) => {
      commit((p) => {
        const idx = p.blocks.findIndex((b) => b.id === id);
        if (idx < 0) return p;
        const original = p.blocks[idx];
        const copy = clone(original);
        copy.id =
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `blk_${Math.random().toString(36).slice(2, 11)}`;
        const blocks = [...p.blocks];
        blocks.splice(idx + 1, 0, copy);
        return { ...p, blocks };
      });
    },
    [commit]
  );

  const moveBlock = useCallback(
    (fromIndex: number, toIndex: number) => {
      commit((p) => {
        if (
          fromIndex === toIndex ||
          fromIndex < 0 ||
          toIndex < 0 ||
          fromIndex >= p.blocks.length ||
          toIndex >= p.blocks.length
        )
          return p;
        const blocks = [...p.blocks];
        const [moved] = blocks.splice(fromIndex, 1);
        blocks.splice(toIndex, 0, moved);
        return { ...p, blocks };
      });
    },
    [commit]
  );

  const toggleVisibility = useCallback(
    (id: string) => {
      commit((p) => ({
        ...p,
        blocks: p.blocks.map((b) => (b.id === id ? { ...b, visible: !b.visible } : b)),
      }));
    },
    [commit]
  );

  const updateBlockConfig = useCallback(
    <T extends InvitationBlock["config"]>(id: string, partial: Partial<T>) => {
      commit((p) => ({
        ...p,
        blocks: p.blocks.map((b) =>
          b.id === id ? ({ ...b, config: { ...b.config, ...partial } } as InvitationBlock) : b
        ),
      }));
    },
    [commit]
  );

  const updateBlockStyle = useCallback(
    (id: string, style: BlockStyleOverride | undefined) => {
      commit((p) => ({
        ...p,
        blocks: p.blocks.map((b) => (b.id === id ? { ...b, style } : b)),
      }));
    },
    [commit]
  );

  const selectedBlock = useMemo(
    () => state.present.blocks.find((b) => b.id === selectedId) || null,
    [state.present.blocks, selectedId]
  );

  return {
    schema: state.present,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
    undo,
    redo,
    reset,
    addBlock,
    removeBlock,
    duplicateBlock,
    moveBlock,
    toggleVisibility,
    updateBlockConfig,
    updateBlockStyle,
    selectedId,
    setSelectedId,
    selectedBlock,
  };
}
