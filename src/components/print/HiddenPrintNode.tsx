import { QRCodeSVG } from "qrcode.react";
import { format, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import type { WeddingPrintData } from "./PrintDesignStep";

interface HiddenPrintNodeProps {
  displayName: string;
  syncToken: string;
  fontFamily: string;
  backgroundImageUrl: string | null;
  weddingData: WeddingPrintData;
}

function formatWeddingDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), "EEEE d MMMM yyyy", { locale: it });
  } catch {
    return dateStr;
  }
}

function formatTime(timeStr: string | null): string {
  if (!timeStr) return '';
  const parts = timeStr.split(':');
  return `${parts[0]}:${parts[1]}`;
}

const HiddenPrintNode = ({
  displayName,
  syncToken,
  fontFamily,
  backgroundImageUrl,
  weddingData,
}: HiddenPrintNodeProps) => {
  const rsvpUrl = syncToken ? `https://wedsapp.it/rsvp/${syncToken}` : '';
  const shortLink = syncToken ? `wedsapp.it/rsvp/${syncToken.substring(0, 8)}` : '';
  const formattedDate = formatWeddingDate(weddingData.weddingDate);
  const ceremonyTime = formatTime(weddingData.ceremonyTime);
  const hasCeremony = !!weddingData.ceremonyVenueName;
  const hasReception = !!weddingData.receptionVenueName;

  return (
    <div
      id="hidden-print-node"
      style={{
        position: 'fixed',
        top: '-9999px',
        left: '-9999px',
        width: '400px',
        height: `${Math.round(400 * 1.414)}px`,
        overflow: 'hidden',
        backgroundColor: '#ffffff',
        fontFamily,
      }}
    >
      {/* TOP HALF: Photo with watercolor edges */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '50%' }}>
        {backgroundImageUrl ? (
          <div
            style={{
              width: '100%',
              height: '100%',
              backgroundImage: `url(${backgroundImageUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              WebkitMaskImage: 'linear-gradient(to bottom, black 60%, transparent 100%)',
              maskImage: 'linear-gradient(to bottom, black 60%, transparent 100%)',
            }}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', backgroundColor: '#f5f5f5' }} />
        )}
      </div>

      {/* BOTTOM HALF: Formal text */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: '50%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '12px 24px',
          textAlign: 'center',
        }}
      >
        {/* Guest name */}
        <p style={{ fontSize: '11px', letterSpacing: '0.05em', color: '#888', marginBottom: '10px' }}>
          Cari <span style={{ fontWeight: 600 }}>{displayName}</span>
        </p>

        {/* Couple names */}
        <p style={{ fontSize: '18px', fontWeight: 600, color: '#1a1a1a', lineHeight: 1.3 }}>
          {weddingData.partner1Name} e {weddingData.partner2Name}
        </p>
        <p style={{ fontSize: '11px', color: '#888', marginTop: '4px', marginBottom: '10px' }}>
          sono lieti di annunciare il loro matrimonio
        </p>

        {/* Date & time */}
        <p style={{ fontSize: '13px', fontWeight: 500, color: '#1a1a1a', textTransform: 'capitalize' }}>
          {formattedDate}
        </p>
        {ceremonyTime && (
          <p style={{ fontSize: '11px', color: '#888' }}>
            alle ore {ceremonyTime}
          </p>
        )}

        {/* Ceremony venue */}
        {hasCeremony && (
          <div style={{ marginTop: '8px' }}>
            <p style={{ fontSize: '10px', color: '#888' }}>presso</p>
            <p style={{ fontSize: '13px', fontWeight: 500, color: '#1a1a1a' }}>
              {weddingData.ceremonyVenueName}
            </p>
            {weddingData.ceremonyVenueAddress && (
              <p style={{ fontSize: '9px', color: '#999' }}>{weddingData.ceremonyVenueAddress}</p>
            )}
          </div>
        )}

        {/* Reception venue */}
        {hasReception && (
          <div style={{ marginTop: '8px' }}>
            <p style={{ fontSize: '10px', color: '#888' }}>
              A seguire festeggeremo insieme presso
            </p>
            <p style={{ fontSize: '13px', fontWeight: 500, color: '#1a1a1a' }}>
              {weddingData.receptionVenueName}
            </p>
          </div>
        )}

        {/* QR code + shortlink */}
        {syncToken ? (
          <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ padding: '4px', backgroundColor: '#ffffff', borderRadius: '4px', border: '1px solid #eee' }}>
              <QRCodeSVG value={rsvpUrl} size={50} />
            </div>
            <div style={{ textAlign: 'left' }}>
              <p style={{ fontSize: '7px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#aaa' }}>
                Oppure visita il link:
              </p>
              <p style={{ fontSize: '9px', fontFamily: 'monospace', fontWeight: 700, color: '#333' }}>
                {shortLink}
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default HiddenPrintNode;
