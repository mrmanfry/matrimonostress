import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  cssFontFamily,
  layoutColumns,
  LINE_GAP,
  TITLE_SIZE_MULT,
  type TableauStyle,
  type TableauRenderBlock,
} from "@/lib/tableauGeneratorEngine";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Columns, Eye, EyeOff, Settings2 } from "lucide-react";

interface CommonProps {
  block: TableauRenderBlock;
  style: TableauStyle;
  canvasWidth: number;
  canvasHeight: number;
  readOnly?: boolean;
}

interface TitleProps extends CommonProps {
  onToggleVisible?: (v: boolean) => void;
}

export function TableauTitleBlock({ block, style, canvasWidth, canvasHeight, readOnly, onToggleVisible }: TitleProps) {
  const pos = block.entry.title;
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `title-${block.tableId}`,
    data: { tableId: block.tableId, sub: "title" },
    disabled: readOnly,
  });
  if (!pos.visible) return null;
  const left = (pos.x_pct / 100) * canvasWidth;
  const top = (pos.y_pct / 100) * canvasHeight;
  const wPx = (block.entry.list.w_pct / 100) * canvasWidth;
  const titleSize = style.baseFontSize * TITLE_SIZE_MULT;
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{
        position: "absolute",
        left,
        top,
        width: wPx,
        transform: CSS.Translate.toString(transform),
        fontFamily: cssFontFamily(style.fontFamily),
        color: style.fontColor,
        textAlign: style.textAlign,
        cursor: readOnly ? "default" : isDragging ? "grabbing" : "grab",
        userSelect: "none",
        touchAction: "none",
        fontSize: `${titleSize}px`,
        fontWeight: 700,
        lineHeight: LINE_GAP,
      }}
      className={cn(
        "group rounded-sm outline-2 outline-transparent hover:outline-primary/50 hover:outline-dashed transition-all",
        isDragging && "opacity-70 outline-primary outline-dashed",
      )}
    >
      {block.title}
      {!readOnly && onToggleVisible && (
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onToggleVisible(false); }}
          className="absolute -top-2 -right-2 bg-background border rounded-full p-1 opacity-0 group-hover:opacity-100"
          title="Nascondi titolo"
        >
          <EyeOff className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

interface ListProps extends CommonProps {
  onWidthChange?: (wPct: number) => void;
  onColumnsChange?: (c: 1 | 2 | 3) => void;
  onShowTitle?: () => void;
}

export function TableauListBlock({ block, style, canvasWidth, canvasHeight, readOnly, onWidthChange, onColumnsChange, onShowTitle }: ListProps) {
  const pos = block.entry.list;
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `list-${block.tableId}`,
    data: { tableId: block.tableId, sub: "list" },
    disabled: readOnly,
  });
  const left = (pos.x_pct / 100) * canvasWidth;
  const top = (pos.y_pct / 100) * canvasHeight;
  const widthPx = (pos.w_pct / 100) * canvasWidth;
  const baseSize = style.baseFontSize;
  const cols = pos.columns || 1;
  const perCol = Math.ceil(block.lines.length / cols);
  const positions = layoutColumns(block.lines.length, cols);
  const colWidthPx = widthPx / cols;

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{
        position: "absolute",
        left,
        top,
        width: widthPx,
        transform: CSS.Translate.toString(transform),
        fontFamily: cssFontFamily(style.fontFamily),
        color: style.fontColor,
        textAlign: style.textAlign,
        cursor: readOnly ? "default" : isDragging ? "grabbing" : "grab",
        userSelect: "none",
        touchAction: "none",
      }}
      className={cn(
        "group rounded-sm outline-2 outline-transparent hover:outline-primary/50 hover:outline-dashed transition-all",
        isDragging && "opacity-70 outline-primary outline-dashed",
      )}
    >
      <div
        style={{
          position: "relative",
          height: perCol * baseSize * LINE_GAP,
        }}
      >
        {block.lines.map((line, i) => {
          const p = positions[i];
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: p.col * colWidthPx,
                top: p.row * baseSize * LINE_GAP,
                width: colWidthPx,
                fontSize: `${baseSize}px`,
                lineHeight: 1,
                textAlign: style.textAlign,
              }}
            >
              {line}
            </div>
          );
        })}
      </div>

      {!readOnly && (
        <>
          {onWidthChange && (
            <div
              onMouseDown={(e) => {
                e.stopPropagation();
                const startX = e.clientX;
                const startW = pos.w_pct;
                const move = (ev: MouseEvent) => {
                  const dx = ev.clientX - startX;
                  const newW = Math.max(5, Math.min(60, startW + (dx / canvasWidth) * 100));
                  onWidthChange(newW);
                };
                const up = () => {
                  window.removeEventListener("mousemove", move);
                  window.removeEventListener("mouseup", up);
                };
                window.addEventListener("mousemove", move);
                window.addEventListener("mouseup", up);
              }}
              className="absolute -right-1 top-1/2 -translate-y-1/2 w-2 h-6 bg-primary/60 rounded opacity-0 group-hover:opacity-100 cursor-ew-resize"
              title="Ridimensiona"
            />
          )}
          <div
            onPointerDown={(e) => e.stopPropagation()}
            className="absolute -top-2 -left-2 opacity-0 group-hover:opacity-100 flex gap-1"
          >
            <Popover>
              <PopoverTrigger asChild>
                <Button size="icon" variant="outline" className="h-6 w-6 bg-background">
                  <Settings2 className="w-3 h-3" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 space-y-3" side="top" align="start">
                <div>
                  <Label className="text-xs flex items-center gap-1"><Columns className="w-3 h-3" /> Colonne</Label>
                  <div className="flex gap-1 mt-1">
                    {[1, 2, 3].map((c) => (
                      <Button
                        key={c}
                        size="sm"
                        variant={cols === c ? "default" : "outline"}
                        className="flex-1 h-7"
                        onClick={() => onColumnsChange?.(c as 1 | 2 | 3)}
                      >
                        {c}
                      </Button>
                    ))}
                  </div>
                </div>
                {onShowTitle && !block.entry.title.visible && (
                  <Button size="sm" variant="outline" className="w-full gap-1" onClick={onShowTitle}>
                    <Eye className="w-3 h-3" /> Mostra titolo tavolo
                  </Button>
                )}
              </PopoverContent>
            </Popover>
          </div>
        </>
      )}
    </div>
  );
}
