import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { cssFontFamily, type TableauStyle, type TableauRenderBlock } from "@/lib/tableauGeneratorEngine";
import { cn } from "@/lib/utils";

interface Props {
  block: TableauRenderBlock;
  style: TableauStyle;
  canvasWidth: number;
  canvasHeight: number;
  onWidthChange?: (wPct: number) => void;
}

export function TableauBlock({ block, style, canvasWidth, canvasHeight, onWidthChange }: Props) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `block-${block.tableId}`,
    data: { tableId: block.tableId },
  });

  const wPct = block.position.w_pct ?? 20;
  const leftPx = (block.position.x_pct / 100) * canvasWidth;
  const topPx = (block.position.y_pct / 100) * canvasHeight;
  const widthPx = (wPct / 100) * canvasWidth;

  // Scala font: baseFontSize è in pt (relativo alla stampa fisica).
  // Sul canvas mostriamo px scalati proporzionalmente all'altezza rispetto ai punti.
  // Trattiamo 1pt ~ 1.33px, poi scaliamo con canvasWidth / canvasWidth (nessuna scala aggiuntiva: usiamo pt come px scala visiva coerente).
  // Per coerenza col PDF (dove baseFontSize è pt sul foglio fisico), calcoliamo il rapporto pt->px:
  // sul canvas la larghezza rappresenta widthCm; ma qui il canvas conosce solo la sua larghezza in px.
  // Semplifichiamo: passiamo il fattore ptToPx dal padre non è necessario — usiamo un rapporto stabile
  // basato sul fatto che canvas 1cm = canvasWidth / widthCm px. Non abbiamo widthCm qui, quindi
  // deleghiamo lo scale al parent tramite CSS custom property.
  const baseSize = style.baseFontSize;
  const titleSize = baseSize * 1.4;

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{
        position: "absolute",
        left: leftPx,
        top: topPx,
        width: widthPx,
        transform: CSS.Translate.toString(transform),
        fontFamily: cssFontFamily(style.fontFamily),
        color: style.fontColor,
        textAlign: style.textAlign,
        cursor: isDragging ? "grabbing" : "grab",
        userSelect: "none",
        touchAction: "none",
      }}
      className={cn(
        "group rounded-sm outline-2 outline-transparent hover:outline-primary/50 hover:outline-dashed transition-all",
        isDragging && "opacity-70 outline-primary outline-dashed",
      )}
    >
      <div style={{ fontSize: `${titleSize}px`, fontWeight: 700, lineHeight: 1.2 }}>{block.title}</div>
      {block.lines.map((l, i) => (
        <div key={i} style={{ fontSize: `${baseSize}px`, lineHeight: 1.35 }}>{l}</div>
      ))}
      {onWidthChange && (
        <div
          onMouseDown={(e) => {
            e.stopPropagation();
            const startX = e.clientX;
            const startW = wPct;
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
    </div>
  );
}
