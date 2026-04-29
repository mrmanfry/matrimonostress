import type { CoverBlock } from "@/lib/invitationBlocks/types";
import { type WeddingPublicData, formatItalianDate } from "./_shared";

interface Props {
  block: CoverBlock;
  wedding: WeddingPublicData;
}

export function CoverBlockView({ block, wedding }: Props) {
  if (!block.visible) return null;
  const { config, style } = block;
  const primaryColor = style?.accentColor || wedding.theme.primaryColor;
  const { dayOfWeek, dayNumber, monthName, year } = formatItalianDate(
    wedding.weddingDate,
    wedding.timezone
  );

  // Title: explicit override or fallback to canonical names from wedding.*
  const hasOverride = !!(config.title && config.title.trim());
  const name1 = wedding.partner1Name;
  const name2 = wedding.partner2Name;
  const heroImageUrl = config.imageUrl;

  return (
    <section
      className="relative min-h-screen flex flex-col items-center justify-center"
      style={{
        backgroundImage: heroImageUrl
          ? `url(${heroImageUrl})`
          : `linear-gradient(135deg, ${primaryColor}33 0%, ${primaryColor}11 100%)`,
        backgroundSize: "cover",
        backgroundPosition: `center ${config.imagePosition ?? "center"}`,
      }}
    >
      <div
        className="absolute inset-0"
        style={{
          background: heroImageUrl
            ? "linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.1) 100%)"
            : "transparent",
        }}
      />
      <div className="relative z-10 text-center text-white px-6 space-y-6">
        {hasOverride ? (
          <h1 className="font-cormorant text-5xl sm:text-6xl md:text-7xl font-light leading-tight">
            {config.title}
          </h1>
        ) : config.titleStyle === "stacked" ? (
          <h1 className="font-cormorant text-5xl sm:text-6xl md:text-7xl font-light leading-tight">
            {name1}
            <span
              className="block font-playfair text-3xl sm:text-4xl italic my-2"
              style={{ color: primaryColor }}
            >
              e
            </span>
            {name2}
          </h1>
        ) : (
          <h1 className="font-cormorant text-5xl sm:text-6xl md:text-7xl font-light leading-tight">
            {name1} <span style={{ color: primaryColor }}>&</span> {name2}
          </h1>
        )}
        {config.subtitle && (
          <p className="font-playfair text-lg italic text-white/80">{config.subtitle}</p>
        )}
        <p className="font-cormorant text-2xl sm:text-3xl capitalize">
          {dayOfWeek} {dayNumber} {monthName} {year}
        </p>
      </div>
    </section>
  );
}
