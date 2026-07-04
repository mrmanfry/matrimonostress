import { useEffect, useRef, useState } from "react";
import { DndContext, DragEndEvent } from "@dnd-kit/core";
import { TableauTitleBlock, TableauListBlock } from "./TableauBlock";
import type { TableauRenderBlock, TableauStyle } from "@/lib/tableauGeneratorEngine";

export interface BlockMoveArgs {
  tableId: string;
  sub: "title" | "list";
  x_pct: number;
  y_pct: number;
}

interface Props {
  backgroundUrl: string;
  widthCm: number;
  heightCm: number;
  style: TableauStyle;
  blocks: TableauRenderBlock[];
  onBlockMove: (args: BlockMoveArgs) => void;
  onBlockWidth: (tableId: string, wPct: number) => void;
  onColumnsChange: (tableId: string, cols: 1 | 2 | 3) => void;
  onToggleTitle: (tableId: string, visible: boolean) => void;
  readOnly?: boolean;
}

export function TableauCanvas({
  backgroundUrl,
  widthCm,
  heightCm,
  style,
  blocks,
  onBlockMove,
  onBlockWidth,
  onColumnsChange,
  onToggleTitle,
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
    const data = e.active.data.current as any;
    const tableId = data?.tableId;
    const sub = data?.sub as "title" | "list" | undefined;
    if (!tableId || !sub || !e.delta) return;
    const b = blocks.find((x) => x.tableId === tableId);
    if (!b) return;
    const cur = sub === "title" ? b.entry.title : b.entry.list;
    const dxPct = (e.delta.x / size.w) * 100;
    const dyPct = (e.delta.y / size.h) * 100;
    const newX = Math.max(0, Math.min(95, cur.x_pct + dxPct));
    const newY = Math.max(0, Math.min(95, cur.y_pct + dyPct));
    onBlockMove({ tableId, sub, x_pct: newX, y_pct: newY });
  };

  // Scala baseFontSize (pt) → px: 1cm = size.w/widthCm px; 1pt = 1/28.3465 cm.
  const scaledStyle: TableauStyle = {
    ...style,
    baseFontSize: style.baseFontSize * (size.w / widthCm) / 28.3465,
  };

  const bgFit = style.bgFit ?? "cover";
  const bandsColor = style.bgBandsColor ?? "#ffffff";

  return (
    <div ref={wrapRef} className="w-full h-full flex items-center justify-center bg-muted/30 overflow-hidden">
      <DndContext onDragEnd={handleDragEnd}>
        <div
          className="relative shadow-2xl overflow-hidden"
          style={{ width: size.w, height: size.h, backgroundColor: bandsColor }}
        >
          <img
            src={backgroundUrl}
            alt=""
            draggable={false}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: bgFit,
              pointerEvents: "none",
            }}
          />
          <div className="absolute inset-0">
            {size.w > 0 && blocks.map((b) => (
              <div key={b.tableId}>
                <TableauTitleBlock
                  block={b}
                  style={scaledStyle}
                  canvasWidth={size.w}
                  canvasHeight={size.h}
                  readOnly={readOnly}
                  onToggleVisible={(v) => onToggleTitle(b.tableId, v)}
                />
                <TableauListBlock
                  block={b}
                  style={scaledStyle}
                  canvasWidth={size.w}
                  canvasHeight={size.h}
                  readOnly={readOnly}
                  onWidthChange={(w) => onBlockWidth(b.tableId, w)}
                  onColumnsChange={(c) => onColumnsChange(b.tableId, c)}
                  onShowTitle={() => onToggleTitle(b.tableId, true)}
                />
              </div>
            ))}
          </div>
        </div>
      </DndContext>
    </div>
  );
}
