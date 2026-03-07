import { QRCodeSVG } from "qrcode.react";
import { format, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import type { WeddingPrintData } from "./PrintDesignStep";
import type { ImageTransform, EdgeStyle } from "./PrintInvitationEditor";

interface HiddenPrintNodeProps {
  displayName: string;
  syncToken: string;
  fontFamily: string;
  backgroundImageUrl: string | null;
  weddingData: WeddingPrintData;
  imageTransform: ImageTransform;
  edgeStyle: EdgeStyle;
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

// Native A5 at 300 DPI = 1748 x 2480 px
// Scale factor from old 400px width: ~4.37
const W = 1748;
const H = 2480;

const HiddenPrintNode = ({
  displayName,
  syncToken,
  fontFamily,
  backgroundImageUrl,
  weddingData,
  imageTransform,
  edgeStyle,
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
        width: `${W}px`,
        height: `${H}px`,
        overflow: 'hidden',
        backgroundColor: '#ffffff',
        fontFamily,
      }}
    >
      {/* TOP HALF: Photo with transform */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '50%', overflow: 'hidden', backgroundColor: '#ffffff' }}>
        {backgroundImageUrl ? (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              ...(edgeStyle === 'watercolor' ? {
                WebkitMaskImage: 'url(/images/watercolor-mask.png)',
                maskImage: 'url(/images/watercolor-mask.png)',
                WebkitMaskSize: 'cover',
                maskSize: 'cover' as any,
                WebkitMaskPosition: 'center',
                maskPosition: 'center' as any,
                WebkitMaskRepeat: 'no-repeat',
                maskRepeat: 'no-repeat' as any,
              } : edgeStyle === 'soft' ? {
                WebkitMaskImage: 'radial-gradient(ellipse 85% 80% at 50% 45%, black 50%, transparent 95%)',
                maskImage: 'radial-gradient(ellipse 85% 80% at 50% 45%, black 50%, transparent 95%)',
              } : {}),
            }}
          >
            <img
              src={backgroundImageUrl}
              alt=""
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                transform: `translate(calc(-50% + ${imageTransform.x}%), calc(-50% + ${imageTransform.y}%)) scale(${imageTransform.scale})`,
                minWidth: '100%',
                minHeight: '100%',
                objectFit: 'cover',
              }}
            />
          </div>
        ) : (
          <div style={{ width: '100%', height: '100%', backgroundColor: '#f5f5f5' }} />
        )}
      </div>

      {/* BOTTOM HALF: Formal text — all sizes scaled ~4.37x */}
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
          padding: '52px 105px',
          textAlign: 'center',
        }}
      >
        <p style={{ fontSize: '48px', letterSpacing: '0.05em', color: '#888', marginBottom: '44px' }}>
          Cari <span style={{ fontWeight: 600 }}>{displayName}</span>
        </p>
        <p style={{ fontSize: '79px', fontWeight: 600, color: '#1a1a1a', lineHeight: 1.3 }}>
          {weddingData.partner1Name} e {weddingData.partner2Name}
        </p>
        <p style={{ fontSize: '48px', color: '#888', marginTop: '17px', marginBottom: '44px' }}>
          sono lieti di annunciare il loro matrimonio
        </p>
        <p style={{ fontSize: '57px', fontWeight: 500, color: '#1a1a1a', textTransform: 'capitalize' }}>
          {formattedDate}
        </p>
        {ceremonyTime && (
          <p style={{ fontSize: '48px', color: '#888' }}>
            alle ore {ceremonyTime}
          </p>
        )}
        {hasCeremony && (
          <div style={{ marginTop: '35px' }}>
            <p style={{ fontSize: '44px', color: '#888' }}>presso</p>
            <p style={{ fontSize: '57px', fontWeight: 500, color: '#1a1a1a' }}>
              {weddingData.ceremonyVenueName}
            </p>
            {weddingData.ceremonyVenueAddress && (
              <p style={{ fontSize: '39px', color: '#999' }}>{weddingData.ceremonyVenueAddress}</p>
            )}
          </div>
        )}
        {hasReception && (
          <div style={{ marginTop: '35px' }}>
            <p style={{ fontSize: '44px', color: '#888' }}>
              A seguire festeggeremo insieme presso
            </p>
            <p style={{ fontSize: '57px', fontWeight: 500, color: '#1a1a1a' }}>
              {weddingData.receptionVenueName}
            </p>
          </div>
        )}
        {syncToken ? (
          <div style={{ marginTop: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ padding: '17px', backgroundColor: '#ffffff', borderRadius: '17px', border: '4px solid #eee' }}>
              <QRCodeSVG value={rsvpUrl} size={160} />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default HiddenPrintNode;
