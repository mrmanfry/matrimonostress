import { Gift, Heart, Plane, Wine, ExternalLink, Copy } from "lucide-react";
import { toast } from "sonner";
import type { GiftRegistryBlock } from "@/lib/invitationBlocks/types";
import { imagePositionToCss } from "@/lib/invitationBlocks/imagePosition";
import { type WeddingPublicData, applyStyle } from "./_shared";

interface Props {
  block: GiftRegistryBlock;
  wedding: WeddingPublicData;
}

const ICONS = { gift: Gift, heart: Heart, rings: Gift, plane: Plane, champagne: Wine } as const;

export function GiftRegistryBlockView({ block, wedding }: Props) {
  if (!block.visible) return null;
  const { config, style } = block;
  const primaryColor = style?.accentColor || wedding.theme.primaryColor;
  const { containerStyle, padY } = applyStyle(style, { background: "#ffffff" });

  return (
    <section className={`${padY} px-6 text-center`} style={containerStyle}>
      <div className="max-w-lg mx-auto space-y-6">
        <h2 className="font-cormorant text-3xl sm:text-4xl font-light" style={{ color: primaryColor }}>
          {config.title}
        </h2>

        <div className="flex justify-center">
          {config.imageUrl ? (
            <img
              src={config.imageUrl}
              alt=""
              className="w-full max-w-md aspect-[16/10] object-cover rounded-lg"
              style={{ objectPosition: `center ${config.imagePosition ?? "center"}` }}
            />
          ) : config.decoration.kind === "icon" ? (
            (() => {
              const Icon = ICONS[config.decoration.iconName] || Gift;
              return <Icon className="w-12 h-12 text-stone-400" />;
            })()
          ) : config.decoration.kind === "image" ? (
            <img
              src={config.decoration.imageUrl}
              alt=""
              className={
                config.decoration.size === "lg"
                  ? "w-32 h-32"
                  : config.decoration.size === "md"
                  ? "w-20 h-20"
                  : "w-12 h-12"
              }
              style={{ borderRadius: config.decoration.rounded ? "9999px" : "0", objectFit: "cover" }}
            />
          ) : null}
        </div>

        {config.message && (
          <p className="text-stone-600 leading-relaxed whitespace-pre-line">{config.message}</p>
        )}

        {config.coupleNames && (
          <p className="font-cormorant text-xl font-semibold text-stone-800">{config.coupleNames}</p>
        )}

        {config.iban && (
          <div className="bg-stone-50 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-center gap-2">
              <code className="text-sm font-mono text-stone-700 tracking-wide">{config.iban}</code>
              {config.showCopyButton && (
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(config.iban!);
                    toast.success("IBAN copiato!");
                  }}
                  className="p-1.5 rounded-md hover:bg-stone-200 transition-colors"
                  title="Copia IBAN"
                >
                  <Copy className="w-4 h-4 text-stone-500" />
                </button>
              )}
            </div>
            {config.bicSwift && <p className="text-xs text-stone-500">Codice BIC/SWIFT: {config.bicSwift}</p>}
            {config.bankName && <p className="text-xs text-stone-500">{config.bankName}</p>}
          </div>
        )}

        {config.registryUrl && (
          <a
            href={config.registryUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-2 border rounded-full text-sm transition-colors hover:bg-stone-100"
            style={{ borderColor: primaryColor, color: primaryColor }}
          >
            <ExternalLink className="w-4 h-4" />
            Vedi Lista Nozze
          </a>
        )}
      </div>
    </section>
  );
}
