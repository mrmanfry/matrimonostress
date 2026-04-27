import type { InvitationBlock, InvitationPageSchema, PageKind } from "@/lib/invitationBlocks/types";
import { CoverBlockView } from "./blocks/CoverBlock";
import { CeremonyBlockView } from "./blocks/CeremonyBlock";
import { ReceptionBlockView } from "./blocks/ReceptionBlock";
import { RsvpBlockView, type GuestMember, type MemberData } from "./blocks/RsvpBlock";
import { GiftRegistryBlockView } from "./blocks/GiftRegistryBlock";
import { FaqBlockView } from "./blocks/FaqBlock";
import { FooterBlockView } from "./blocks/FooterBlock";
import { StdMessageBlockView, StdResponseBlockView } from "./blocks/StdBlocks";
import {
  RichTextBlockView,
  GalleryBlockView,
  CountdownBlockView,
  ScheduleBlockView,
  TravelInfoBlockView,
  DressCodeBlockView,
  DividerBlockView,
} from "./blocks/MiscBlocks";
import type { WeddingPublicData } from "./blocks/_shared";

export interface PublicInvitationPageProps {
  schema: InvitationPageSchema;
  pageKind: PageKind;
  wedding: WeddingPublicData;
  // RSVP-specific
  members?: GuestMember[];
  memberData?: Record<string, MemberData>;
  onMemberDataChange?: (data: Record<string, MemberData>) => void;
  onSubmitRsvp?: () => Promise<void>;
  submitting?: boolean;
  isReadOnly?: boolean;
  deadlineDate?: string | null;
  cateringConfig?: Parameters<typeof RsvpBlockView>[0]["cateringConfig"];
  // STD-specific
  guestDisplayName?: string;
  coupleName?: string;
  weddingLocation?: string | null;
  ceremonyStartTime?: string | null;
  isPreview?: boolean;
  onSubmitStd?: (response: "likely_yes" | "likely_no" | "unsure") => Promise<void>;
}

function renderBlock(
  block: InvitationBlock,
  props: PublicInvitationPageProps
): React.ReactNode {
  const { wedding } = props;
  switch (block.type) {
    case "cover":
      return <CoverBlockView block={block} wedding={wedding} />;
    case "ceremony":
      return <CeremonyBlockView block={block} wedding={wedding} />;
    case "reception":
      return <ReceptionBlockView block={block} wedding={wedding} />;
    case "rsvp":
      if (!props.members || !props.memberData || !props.onMemberDataChange || !props.onSubmitRsvp)
        return null;
      return (
        <RsvpBlockView
          block={block}
          wedding={wedding}
          members={props.members}
          memberData={props.memberData}
          onMemberDataChange={props.onMemberDataChange}
          onSubmit={props.onSubmitRsvp}
          submitting={!!props.submitting}
          isReadOnly={props.isReadOnly}
          deadlineDate={props.deadlineDate}
          cateringConfig={props.cateringConfig}
        />
      );
    case "gift_registry":
      return <GiftRegistryBlockView block={block} wedding={wedding} />;
    case "faq":
      return <FaqBlockView block={block} wedding={wedding} />;
    case "footer":
      return <FooterBlockView block={block} wedding={wedding} />;
    case "std_message":
      return (
        <StdMessageBlockView
          block={block}
          wedding={wedding}
          guestDisplayName={props.guestDisplayName || ""}
        />
      );
    case "std_response":
      if (!props.onSubmitStd) return null;
      return (
        <StdResponseBlockView
          block={block}
          wedding={wedding}
          coupleName={props.coupleName || ""}
          weddingLocation={props.weddingLocation}
          ceremonyStartTime={props.ceremonyStartTime}
          isPreview={props.isPreview}
          isReadOnly={props.isReadOnly}
          onSubmit={props.onSubmitStd}
        />
      );
    case "rich_text":
      return <RichTextBlockView block={block} wedding={wedding} />;
    case "gallery":
      return <GalleryBlockView block={block} wedding={wedding} />;
    case "countdown":
      return <CountdownBlockView block={block} wedding={wedding} />;
    case "schedule":
      return <ScheduleBlockView block={block} wedding={wedding} />;
    case "travel_info":
      return <TravelInfoBlockView block={block} wedding={wedding} />;
    case "dress_code":
      return <DressCodeBlockView block={block} wedding={wedding} />;
    case "divider":
      return <DividerBlockView block={block} wedding={wedding} />;
    default:
      return null;
  }
}

export function PublicInvitationPage(props: PublicInvitationPageProps) {
  const isStd = props.pageKind === "std";
  const heroImageUrl =
    (props.schema.blocks.find((b) => b.type === "cover") as
      | { config?: { imageUrl?: string | null } }
      | undefined)?.config?.imageUrl || null;

  if (isStd) {
    // Save The Date: full-screen immersive layered with hero background
    return (
      <div className="relative min-h-screen">
        <div
          className="relative min-h-screen flex flex-col"
          style={{
            backgroundImage: heroImageUrl
              ? `url(${heroImageUrl})`
              : `linear-gradient(135deg, ${props.wedding.theme.primaryColor}33 0%, ${props.wedding.theme.primaryColor}11 100%)`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div
            className="absolute inset-0"
            style={{
              background: heroImageUrl
                ? "linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.4) 40%, rgba(0,0,0,0.2) 70%, transparent 100%)"
                : "transparent",
            }}
          />
          <div className="relative z-10 flex-1 flex flex-col justify-end pb-2">
            {props.schema.blocks.map((b) => (
              <div key={b.id}>{renderBlock(b, props)}</div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // RSVP / formal invite: stacked sections
  return (
    <div className="relative">
      {props.schema.blocks.map((b) => (
        <div key={b.id}>{renderBlock(b, props)}</div>
      ))}
    </div>
  );
}
