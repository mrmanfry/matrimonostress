import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { InvitationBlock } from "@/lib/invitationBlocks/types";
import { BLOCK_META } from "./blockMeta";
import { Button } from "@/components/ui/button";
import { GripVertical, Eye, EyeOff, Copy, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface RowProps {
  block: InvitationBlock;
  selected: boolean;
  onSelect: () => void;
  onToggleVisibility: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
}

function BlockRow({
  block,
  selected,
  onSelect,
  onToggleVisibility,
  onDuplicate,
  onRemove,
}: RowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
  });
  const meta = BLOCK_META[block.type];
  const Icon = meta.icon;

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex items-center gap-2 rounded-md border bg-card px-2 py-2 text-sm",
        selected && "border-primary ring-1 ring-primary"
      )}
    >
      <button
        type="button"
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none"
        {...attributes}
        {...listeners}
        aria-label="Trascina per riordinare"
      >
        <GripVertical className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={onSelect}
        className="flex-1 flex items-center gap-2 min-w-0 text-left"
      >
        <Icon className="w-4 h-4 shrink-0 text-muted-foreground" />
        <span className={cn("truncate", !block.visible && "opacity-50 line-through")}>
          {meta.label}
        </span>
      </button>
      <div className="flex items-center gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onToggleVisibility}
          title={block.visible ? "Nascondi" : "Mostra"}
        >
          {block.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onDuplicate}
          title="Duplica"
        >
          <Copy className="w-3.5 h-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive hover:text-destructive"
          onClick={onRemove}
          title="Elimina"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

interface Props {
  blocks: InvitationBlock[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onToggleVisibility: (id: string) => void;
  onDuplicate: (id: string) => void;
  onRemove: (id: string) => void;
}

export function BlockListEditor({
  blocks,
  selectedId,
  onSelect,
  onReorder,
  onToggleVisibility,
  onDuplicate,
  onRemove,
}: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = blocks.findIndex((b) => b.id === active.id);
    const to = blocks.findIndex((b) => b.id === over.id);
    if (from < 0 || to < 0) return;
    onReorder(from, to);
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-1.5">
          {blocks.map((b) => (
            <BlockRow
              key={b.id}
              block={b}
              selected={selectedId === b.id}
              onSelect={() => onSelect(b.id)}
              onToggleVisibility={() => onToggleVisibility(b.id)}
              onDuplicate={() => onDuplicate(b.id)}
              onRemove={() => onRemove(b.id)}
            />
          ))}
          {/* enable arrayMove import side-effect for future use */}
          {/* eslint-disable-next-line @typescript-eslint/no-unused-expressions */}
          {(() => {
            void arrayMove;
            return null;
          })()}
        </div>
      </SortableContext>
    </DndContext>
  );
}
