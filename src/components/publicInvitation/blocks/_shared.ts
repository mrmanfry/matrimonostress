// Common shared types/utils for public block renderers.

import type { BlockStyleOverride } from "@/lib/invitationBlocks/types";

export interface WeddingPublicData {
  partner1Name: string;
  partner2Name: string;
  weddingDate: string;
  timezone: string;
  location?: string | null;
  ceremonyVenueName?: string | null;
  ceremonyVenueAddress?: string | null;
  ceremonyStartTime?: string | null;
  receptionVenueName?: string | null;
  receptionVenueAddress?: string | null;
  receptionStartTime?: string | null;
  theme: { primaryColor: string };
}

export const formatTime = (time?: string | null): string => {
  if (!time) return "";
  const [hh, mm] = time.split(":");
  return `ORE ${hh}:${mm || "00"}`;
};

export const getMapsLink = (address: string): string =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

export function applyStyle(
  style: BlockStyleOverride | undefined,
  fallback: { background?: string; text?: string; accent?: string } = {}
): { containerStyle: React.CSSProperties; padY: string } {
  const bg = style?.backgroundColor || fallback.background;
  const text = style?.textColor || fallback.text;
  const padY =
    style?.paddingY === "sm"
      ? "py-10"
      : style?.paddingY === "lg"
      ? "py-20"
      : "py-16";
  const containerStyle: React.CSSProperties = {};
  if (bg) containerStyle.backgroundColor = bg;
  if (text) containerStyle.color = text;
  return { containerStyle, padY };
}

export function formatItalianDate(weddingDate: string, timezone: string) {
  const d = new Date(weddingDate + "T12:00:00");
  const tz = timezone || "Europe/Rome";
  return {
    dayOfWeek: new Intl.DateTimeFormat("it-IT", { weekday: "long", timeZone: tz }).format(d),
    dayNumber: new Intl.DateTimeFormat("it-IT", { day: "numeric", timeZone: tz }).format(d),
    monthName: new Intl.DateTimeFormat("it-IT", { month: "long", timeZone: tz }).format(d),
    year: new Intl.DateTimeFormat("it-IT", { year: "numeric", timeZone: tz }).format(d),
    eventDate: d,
  };
}
