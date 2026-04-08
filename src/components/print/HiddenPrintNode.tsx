import { QRCodeSVG } from "qrcode.react";
import type { ImageTransform, EdgeStyle, TextPosition, QrPosition } from "./PrintInvitationEditor";
import type { InvitationTexts } from "./PrintDesignStep";

interface HiddenPrintNodeProps {
  displayName: string;
  syncToken: string;
  fontFamily: string;
  backgroundImageUrl: string | null;
  imageTransform: ImageTransform;
  edgeStyle: EdgeStyle;
  hasPhoto: boolean;
  editableTexts: InvitationTexts;
  textPosition: TextPosition;
  qrPosition: QrPosition;
  textColor: string;
  greeting: string;
}

const W = 1748;
const H = 2480;

const HiddenPrintNode = ({
  displayName,
  syncToken,
  fontFamily,
  backgroundImageUrl,
  imageTransform,
  edgeStyle,
  hasPhoto,
  editableTexts,
  textPosition,
  qrPosition,
  textColor,
  greeting,
}: HiddenPrintNodeProps) => {
  const rsvpUrl = syncToken ? `https://wedsapp.it/rsvp/${syncToken}` : '';
  const mainColor = textColor || '#1a1a1a';
  const secondaryColor = textColor === '#FFFFFF' ? 'rgba(255,255,255,0.7)' : textColor === '#1a1a1a' ? '#888' : `${textColor}99`;
  const tertiaryColor = textColor === '#FFFFFF' ? 'rgba(255,255,255,0.5)' : textColor === '#1a1a1a' ? '#999' : `${textColor}77`;

  const textBlock = (
    <>
      {greeting && (
        <p style={{ fontSize: '48px', letterSpacing: '0.05em', color: secondaryColor, marginBottom: '44px' }}>
          {greeting}
        </p>
      )}
      {editableTexts.names && (
        <p style={{ fontSize: '79px', fontWeight: 600, color: mainColor, lineHeight: 1.3 }}>
          {editableTexts.names}
        </p>
      )}
      {editableTexts.announcement && (
        <p style={{ fontSize: '48px', color: secondaryColor, marginTop: '17px', marginBottom: '44px' }}>
          {editableTexts.announcement}
        </p>
      )}
      {editableTexts.dateText && (
        <p style={{ fontSize: '57px', fontWeight: 500, color: mainColor, textTransform: 'capitalize' }}>
          {editableTexts.dateText}
        </p>
      )}
      {editableTexts.time && editableTexts.timePrefix && (
        <p style={{ fontSize: '48px', color: secondaryColor }}>
          {editableTexts.timePrefix} {editableTexts.time}
        </p>
      )}
      {editableTexts.ceremonyVenue && (
        <div style={{ marginTop: '35px' }}>
          {editableTexts.venuePrefix && (
            <p style={{ fontSize: '44px', color: secondaryColor }}>{editableTexts.venuePrefix}</p>
          )}
          <p style={{ fontSize: '57px', fontWeight: 500, color: mainColor }}>
            {editableTexts.ceremonyVenue}
          </p>
          {editableTexts.ceremonyAddress && (
            <p style={{ fontSize: '39px', color: tertiaryColor }}>{editableTexts.ceremonyAddress}</p>
          )}
        </div>
      )}
      {editableTexts.receptionVenue && (
        <div style={{ marginTop: '35px' }}>
          {editableTexts.receptionPrefix && (
            <p style={{ fontSize: '44px', color: secondaryColor }}>
              {editableTexts.receptionPrefix}
            </p>
          )}
          <p style={{ fontSize: '57px', fontWeight: 500, color: mainColor }}>
            {editableTexts.receptionVenue}
          </p>
          {editableTexts.receptionAddress && (
            <p style={{ fontSize: '39px', color: tertiaryColor }}>{editableTexts.receptionAddress}</p>
          )}
        </div>
      )}
    </>
  );

  const qrSizePx = Math.round((qrPosition.size / 100) * W);

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
      {hasPhoto && (
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
      )}

      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: `${textPosition.y}%`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '0 105px',
          textAlign: 'center',
        }}
      >
        {textBlock}
      </div>

      {syncToken ? (
        <div
          style={{
            position: 'absolute',
            left: `${qrPosition.x}%`,
            top: `${qrPosition.y}%`,
            width: `${qrPosition.size}%`,
          }}
        >
          <div style={{ padding: '13px', backgroundColor: '#ffffff', borderRadius: '13px', border: '3px solid #eee', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <QRCodeSVG value={rsvpUrl} size={qrSizePx} />
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default HiddenPrintNode;
