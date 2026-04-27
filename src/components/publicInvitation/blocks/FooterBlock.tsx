import type { FooterBlock } from "@/lib/invitationBlocks/types";
import { type WeddingPublicData, applyStyle, formatItalianDate } from "./_shared";

interface Props {
  block: FooterBlock;
  wedding: WeddingPublicData;
}

export function FooterBlockView({ block, wedding }: Props) {
  if (!block.visible) return null;
  const { style, config } = block;
  const primaryColor = style?.accentColor || wedding.theme.primaryColor;
  const { containerStyle } = applyStyle(style, { background: "#0c0a09", text: "#fafaf9" });
  const { dayNumber, monthName, year } = formatItalianDate(wedding.weddingDate, wedding.timezone);

  return (
    <footer className="py-12 px-6 text-center" style={containerStyle}>
      <p className="font-cormorant text-2xl font-light" style={{ color: primaryColor }}>
        {wedding.partner1Name} & {wedding.partner2Name}
      </p>
      <p className="text-sm opacity-60 mt-2 capitalize">
        {dayNumber} {monthName} {year}
      </p>
      {config.showPoweredBy && (
        <p className="text-xs opacity-40 mt-6">
          Realizzato con{" "}
          <a
            href="https://wedsapp.it"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:opacity-80"
          >
            WedsApp
          </a>
        </p>
      )}
    </footer>
  );
}
