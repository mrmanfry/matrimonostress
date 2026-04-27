import type {
  RichTextBlock,
  GalleryBlock,
  CountdownBlock,
  ScheduleBlock,
  TravelInfoBlock,
  DressCodeBlock,
  DividerBlock,
} from "@/lib/invitationBlocks/types";
import { type WeddingPublicData, applyStyle, formatItalianDate } from "./_shared";
import { useEffect, useState } from "react";

export function RichTextBlockView({ block, wedding }: { block: RichTextBlock; wedding: WeddingPublicData }) {
  if (!block.visible) return null;
  const { config, style } = block;
  const primaryColor = style?.accentColor || wedding.theme.primaryColor;
  const { containerStyle, padY } = applyStyle(style, { background: "#ffffff" });
  const align =
    config.alignment === "left" ? "text-left" : config.alignment === "right" ? "text-right" : "text-center";
  return (
    <section className={`${padY} px-6 ${align}`} style={containerStyle}>
      <div className="max-w-lg mx-auto space-y-4">
        {config.title && (
          <h2 className="font-cormorant text-3xl font-light" style={{ color: primaryColor }}>
            {config.title}
          </h2>
        )}
        <div className="text-stone-600 whitespace-pre-line leading-relaxed">{config.content}</div>
      </div>
    </section>
  );
}

export function GalleryBlockView({ block, wedding }: { block: GalleryBlock; wedding: WeddingPublicData }) {
  if (!block.visible || block.config.images.length === 0) return null;
  const { config, style } = block;
  const primaryColor = style?.accentColor || wedding.theme.primaryColor;
  const { containerStyle, padY } = applyStyle(style, { background: "#fafaf9" });
  const cols = config.columns === 2 ? "md:grid-cols-2" : "md:grid-cols-3";
  return (
    <section className={`${padY} px-6`} style={containerStyle}>
      <div className="max-w-4xl mx-auto space-y-6">
        {config.title && (
          <h2 className="font-cormorant text-3xl font-light text-center" style={{ color: primaryColor }}>
            {config.title}
          </h2>
        )}
        {config.layout === "grid" ? (
          <div className={`grid grid-cols-2 ${cols} gap-3`}>
            {config.images.map((img) => (
              <figure key={img.id} className="space-y-1">
                <img src={img.url} alt={img.caption || ""} className="w-full aspect-square object-cover rounded-md" />
                {img.caption && <figcaption className="text-xs text-stone-500 text-center">{img.caption}</figcaption>}
              </figure>
            ))}
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-4">
            {config.images.map((img) => (
              <img
                key={img.id}
                src={img.url}
                alt={img.caption || ""}
                className="snap-center shrink-0 w-72 h-72 object-cover rounded-md"
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export function CountdownBlockView({ block, wedding }: { block: CountdownBlock; wedding: WeddingPublicData }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  if (!block.visible) return null;
  const { config, style } = block;
  const primaryColor = style?.accentColor || wedding.theme.primaryColor;
  const { containerStyle, padY } = applyStyle(style, { background: "#ffffff" });
  const target = new Date(wedding.weddingDate + "T12:00:00").getTime();
  const diff = Math.max(0, target - now);
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);
  return (
    <section className={`${padY} px-6 text-center`} style={containerStyle}>
      <div className="max-w-lg mx-auto space-y-4">
        {config.title && (
          <h2 className="font-cormorant text-3xl font-light" style={{ color: primaryColor }}>
            {config.title}
          </h2>
        )}
        <div className="flex justify-center gap-4 text-stone-800">
          {config.showDays && <Cell n={days} l="Giorni" />}
          {config.showHours && <Cell n={hours} l="Ore" />}
          {config.showMinutes && <Cell n={minutes} l="Min" />}
          {config.showSeconds && <Cell n={seconds} l="Sec" />}
        </div>
      </div>
    </section>
  );
}
function Cell({ n, l }: { n: number; l: string }) {
  return (
    <div className="flex flex-col items-center min-w-[60px]">
      <span className="font-cormorant text-4xl font-semibold">{n}</span>
      <span className="text-xs uppercase tracking-wider text-stone-500">{l}</span>
    </div>
  );
}

export function ScheduleBlockView({ block, wedding }: { block: ScheduleBlock; wedding: WeddingPublicData }) {
  if (!block.visible || block.config.items.length === 0) return null;
  const { config, style } = block;
  const primaryColor = style?.accentColor || wedding.theme.primaryColor;
  const { containerStyle, padY } = applyStyle(style, { background: "#fafaf9" });
  return (
    <section className={`${padY} px-6`} style={containerStyle}>
      <div className="max-w-lg mx-auto space-y-6">
        <h2 className="font-cormorant text-3xl font-light text-center" style={{ color: primaryColor }}>
          {config.title}
        </h2>
        <ul className="space-y-4">
          {config.items.map((it) => (
            <li key={it.id} className="flex gap-4">
              <span className="font-cormorant text-xl font-medium w-20 shrink-0" style={{ color: primaryColor }}>
                {it.time}
              </span>
              <div>
                <p className="font-medium text-stone-800">{it.label}</p>
                {it.description && <p className="text-sm text-stone-600">{it.description}</p>}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function TravelInfoBlockView({ block, wedding }: { block: TravelInfoBlock; wedding: WeddingPublicData }) {
  if (!block.visible || block.config.sections.length === 0) return null;
  const { config, style } = block;
  const primaryColor = style?.accentColor || wedding.theme.primaryColor;
  const { containerStyle, padY } = applyStyle(style, { background: "#ffffff" });
  return (
    <section className={`${padY} px-6`} style={containerStyle}>
      <div className="max-w-lg mx-auto space-y-6">
        <h2 className="font-cormorant text-3xl font-light text-center" style={{ color: primaryColor }}>
          {config.title}
        </h2>
        <div className="space-y-5">
          {config.sections.map((s) => (
            <div key={s.id} className="space-y-1">
              <h3 className="font-medium text-stone-800">{s.heading}</h3>
              <p className="text-stone-600 whitespace-pre-line text-sm leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function DressCodeBlockView({ block, wedding }: { block: DressCodeBlock; wedding: WeddingPublicData }) {
  if (!block.visible) return null;
  const { config, style } = block;
  const primaryColor = style?.accentColor || wedding.theme.primaryColor;
  const { containerStyle, padY } = applyStyle(style, { background: "#fafaf9" });
  return (
    <section className={`${padY} px-6 text-center`} style={containerStyle}>
      <div className="max-w-lg mx-auto space-y-5">
        <h2 className="font-cormorant text-3xl font-light" style={{ color: primaryColor }}>
          {config.title}
        </h2>
        {config.description && <p className="text-stone-600">{config.description}</p>}
        {config.paletteColors.length > 0 && (
          <div className="flex justify-center gap-2">
            {config.paletteColors.map((c, i) => (
              <span key={i} className="w-10 h-10 rounded-full border border-stone-200" style={{ backgroundColor: c }} />
            ))}
          </div>
        )}
        {config.referenceImageUrl && (
          <img src={config.referenceImageUrl} alt="" className="mx-auto rounded-lg max-w-xs" />
        )}
      </div>
    </section>
  );
}

export function DividerBlockView({ block, wedding }: { block: DividerBlock; wedding: WeddingPublicData }) {
  if (!block.visible) return null;
  const primaryColor = block.style?.accentColor || wedding.theme.primaryColor;
  if (block.config.style === "dots") {
    return (
      <div className="flex justify-center gap-2 py-6">
        {[0, 1, 2].map((i) => (
          <span key={i} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: primaryColor }} />
        ))}
      </div>
    );
  }
  if (block.config.style === "ornament") {
    return (
      <div className="flex justify-center items-center gap-3 py-6 text-stone-400" style={{ color: primaryColor }}>
        <span className="h-px w-12 bg-current" />
        <span className="font-cormorant text-2xl">✦</span>
        <span className="h-px w-12 bg-current" />
      </div>
    );
  }
  return <div className="py-6"><div className="h-px max-w-xs mx-auto" style={{ backgroundColor: primaryColor }} /></div>;
}
