import { useEffect, useRef, useState } from "react";
import { DndContext, DragEndEvent, useDroppable } from "@dnd-kit/core";
import { TableauBlock } from "./TableauBlock";
import type { TableauRenderBlock, TableauStyle, TableauBlockPosition } from "@/lib/tableauGeneratorEngine";

interface Props {
  backgroundUrl: string;
  widthCm: number;
  heightCm: number;
  style: TableauStyle;
  blocks: TableauRenderBlock[];
  onBlockMove: (tableId: string, pos: TableauBlockPosition) => void;
  onBlockWidth: (tableId: string, wPct: number) => void;
  readOnly?: boolean;
}

function DroppableArea({ children }: { children: React.ReactNode }) {
  const { setNodeRef } = useDroppable({ id: "tableau-canvas" });
  return (
    <div ref={setNodeRef} className="absolute inset-0">
      {children}
    </div>
  );
}

export function TableauCanvas({
  backgroundUrl,
  widthCm,
  heightCm,
  style,
  blocks,
  onBlockMove,
  onBlockWidth,
  readOnly,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const compute = () => {
      const rect = el.getBoundingClientRect();
      const aspect = widthCm / heightCm;
      let w = rect.width;
      let h = w / aspect;
      if (h > rect.height) {
        h = rect.height;
        w = h * aspect;
      }
      setSize({ w, h });
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
  }, [widthCm, heightCm]);

  const handleDragEnd = (e: DragEndEvent) => {
    if (readOnly) return;
    const tableId = (e.active.data.current as any)?.tableId;
    if (!tableId || !e.delta) return;
    const b = blocks.find((x) => x.tableId === tableId);
    if (!b) return;
    const dxPct = (e.delta.x / size.w) * 100;
    const dyPct = (e.delta.y / size.h) * 100;
    const newX = Math.max(0, Math.min(95, b.position.x_pct + dxPct));
    const newY = Math.max(0, Math.min(95, b.position.y_pct + dyPct));
    onBlockMove(tableId, { ...b.position, x_pct: newX, y_pct: newY });
  };

  // Scala baseFontSize (in pt) → px sul canvas basandosi su cm→px.
  // 1cm sul canvas = size.w / widthCm px. 1pt = 1/28.3465 cm.
  const ptToPx = size.w / (widthCm * 28.3465);
  const scaledStyle: TableauStyle = {
    ...style,
    baseFontSize: Math.max(6, style.baseFontSize * ptToPx * 28.3465 / 28.3465 * (72 / 72)),
  };
  // Simplifichiamo: 1pt = size.w/widthCm/28.3465 px. Ricalcolo pulito:
  scaledStyle.baseFontSize = style.baseFontSize * (size.w / widthCm) / 28.3465;

  return (
    <div ref={wrapRef} className="w-full h-full flex items-center justify-center bg-muted/30 overflow-hidden">
      <DndContext onDragEnd={handleDragEnd}>
        <div
          className="relative shadow-2xl bg-white"
          style={{
            width: size.w,
            height: size.h,
            backgroundImage: `url(${backgroundUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <DroppableArea>
            {size.w > 0 && blocks.map((b) => (
              <TableauBlock
                key={b.tableId}
                block={b}
                style={scaledStyle}
                canvasWidth={size.w}
                canvasHeight={size.h}
                onWidthChange={readOnly ? undefined : (w) => onBlockWidth(b.tableId, w)}
              />
            ))}
          </DroppableArea>
        </div>
      </DndContext>
    </div>
  );
}
