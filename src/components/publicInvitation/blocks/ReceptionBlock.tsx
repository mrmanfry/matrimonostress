import { PartyPopper, MapPin } from "lucide-react";
import type { ReceptionBlock } from "@/lib/invitationBlocks/types";
import { imagePositionToCss } from "@/lib/invitationBlocks/imagePosition";
import { type WeddingPublicData, applyStyle, formatTime, getMapsLink } from "./_shared";

interface Props {
  block: ReceptionBlock;
  wedding: WeddingPublicData;
}

export function ReceptionBlockView({ block, wedding }: Props) {
  if (!block.visible) return null;
  const { config, style } = block;
  const primaryColor = style?.accentColor || wedding.theme.primaryColor;
  const { containerStyle, padY } = applyStyle(style, { background: "#ffffff" });

  if (!wedding.receptionVenueName && !wedding.receptionVenueAddress) return null;

  return (
    <section className={`${padY} px-6 text-center`} style={containerStyle}>
      <div className="max-w-lg mx-auto space-y-6">
        <h2 className="font-cormorant text-3xl sm:text-4xl font-light" style={{ color: primaryColor }}>
          {config.sectionTitle}
        </h2>
        <div className="flex justify-center">
          {config.imageUrl ? (
            <img
              src={config.imageUrl}
              alt={wedding.receptionVenueName || "Ricevimento"}
              className="w-full max-w-md aspect-[16/10] object-cover rounded-lg"
              style={{ objectPosition: `center ${config.imagePosition ?? "center"}` }}
            />
          ) : (
            <PartyPopper className="w-12 h-12 text-stone-400" />
          )}
        </div>
        {wedding.receptionVenueName && (
          <h3 className="font-cormorant text-2xl font-semibold text-stone-800">
            {wedding.receptionVenueName}
          </h3>
        )}
        {wedding.receptionVenueAddress && (
          <p className="text-stone-600 whitespace-pre-line">{wedding.receptionVenueAddress}</p>
        )}
        {wedding.receptionStartTime && (
          <p className="text-xl font-medium" style={{ color: primaryColor }}>
            {formatTime(wedding.receptionStartTime)}
          </p>
        )}
        {wedding.receptionVenueAddress && (
          <a
            href={getMapsLink(wedding.receptionVenueAddress)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-2 border rounded-full text-sm transition-colors hover:bg-stone-100"
            style={{ borderColor: primaryColor, color: primaryColor }}
          >
            <MapPin className="w-4 h-4" />
            {config.mapsButtonLabel}
          </a>
        )}
      </div>
    </section>
  );
}
