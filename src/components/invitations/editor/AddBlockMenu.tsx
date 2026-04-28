import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import type { BlockType, InvitationBlock, PageKind } from "@/lib/invitationBlocks/types";
import { BLOCK_META, CATEGORY_LABELS } from "./blockMeta";
import {
  makeCoverBlock,
  makeCeremonyBlock,
  makeReceptionBlock,
  makeRsvpBlock,
  makeGiftRegistryBlock,
  makeFaqBlock,
  makeRichTextBlock,
  makeGalleryBlock,
  makeCountdownBlock,
  makeScheduleBlock,
  makeTravelInfoBlock,
  makeDressCodeBlock,
  makeDividerBlock,
  makeFooterBlock,
  makeStdMessageBlock,
  makeStdResponseBlock,
} from "@/lib/invitationBlocks/defaults";

function makeBlock(type: BlockType): InvitationBlock {
  switch (type) {
    case "cover":
      return makeCoverBlock();
    case "ceremony":
      return makeCeremonyBlock();
    case "reception":
      return makeReceptionBlock();
    case "rsvp":
      return makeRsvpBlock();
    case "gift_registry":
      return makeGiftRegistryBlock();
    case "faq":
      return makeFaqBlock();
    case "rich_text":
      return makeRichTextBlock();
    case "gallery":
      return makeGalleryBlock();
    case "countdown":
      return makeCountdownBlock();
    case "schedule":
      return makeScheduleBlock();
    case "travel_info":
      return makeTravelInfoBlock();
    case "dress_code":
      return makeDressCodeBlock();
    case "divider":
      return makeDividerBlock();
    case "footer":
      return makeFooterBlock();
    case "std_message":
      return makeStdMessageBlock();
    case "std_response":
      return makeStdResponseBlock();
  }
}

interface Props {
  pageKind: PageKind;
  onAdd: (block: InvitationBlock) => void;
}

export function AddBlockMenu({ pageKind, onAdd }: Props) {
  const [open, setOpen] = useState(false);

  const allowed = Object.values(BLOCK_META).filter((m) => m.allowedOn.includes(pageKind));
  const grouped = allowed.reduce<Record<string, typeof allowed>>((acc, m) => {
    (acc[m.category] ||= []).push(m);
    return acc;
  }, {});

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="w-full">
          <Plus className="w-4 h-4 mr-2" />
          Aggiungi blocco
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="max-h-[60vh] overflow-y-auto">
          {(Object.keys(grouped) as Array<keyof typeof CATEGORY_LABELS>).map((cat) => (
            <div key={cat} className="p-2">
              <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {CATEGORY_LABELS[cat]}
              </div>
              <div className="space-y-1">
                {grouped[cat].map((m) => {
                  const Icon = m.icon;
                  return (
                    <button
                      key={m.type}
                      type="button"
                      onClick={() => {
                        onAdd(makeBlock(m.type));
                        setOpen(false);
                      }}
                      className="w-full flex items-start gap-3 rounded-md px-2 py-2 text-left hover:bg-accent transition-colors"
                    >
                      <Icon className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <div className="text-sm font-medium">{m.label}</div>
                        <div className="text-xs text-muted-foreground line-clamp-1">
                          {m.description}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
