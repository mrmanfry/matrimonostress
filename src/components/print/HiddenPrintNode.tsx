import { QRCodeSVG } from "qrcode.react";
import type { ImageTransform, EdgeStyle, TextPosition, QrPosition } from "./PrintInvitationEditor";
import type { TextBlock } from "./PrintDesignStep";

interface HiddenPrintNodeProps {
  displayName: string;
  syncToken: string;
  fontFamily: string;
  backgroundImageUrl: string | null;
  imageTransform: ImageTransform;
  edgeStyle: EdgeStyle;
  hasPhoto: boolean;
  textBlocks: TextBlock[];
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
  textBlocks,
  textPosition,
  qrPosition,
  textColor,
  greeting,
}: HiddenPrintNodeProps) => {
  const rsvpUrl = syncToken ? `https://wedsapp.it/rsvp/${syncToken}` : '';
  const mainColor = textColor || '#1a1a1a';
  const secondaryColor = textColor === '#FFFFFF' ? 'rgba(255,255,255,0.7)' : textColor === '#1a1a1a' ? '#888' : `${textColor}99`;
  const tertiaryColor = textColor === '#FFFFFF' ? 'rgba(255,255,255,0.5)' : textColor === '#1a1a1a' ? '#999' : `${textColor}77`;

  const getBlockStyle = (block: TextBlock): React.CSSProperties => {
    if (block.type !== 'custom') {
      switch (block.type) {
        case 'greeting':
          return { fontSize: '48px', letterSpacing: '0.05em', color: secondaryColor, marginBottom: '44px' };
        case 'names':
          return { fontSize: '79px', fontWeight: 600, color: mainColor, lineHeight: 1.3 };
        case 'announcement':
          return { fontSize: '48px', color: secondaryColor, marginTop: '17px', marginBottom: '44px' };
        case 'dateText':
          return { fontSize: '57px', fontWeight: 500, color: mainColor, textTransform: 'capitalize' };
        case 'timePrefix_time':
          return { fontSize: '48px', color: secondaryColor };
        case 'venuePrefix':
        case 'receptionPrefix':
          return { fontSize: '44px', color: secondaryColor, marginTop: '35px' };
        case 'ceremonyVenue':
        case 'receptionVenue':
          return { fontSize: '57px', fontWeight: 500, color: mainColor };
        case 'ceremonyAddress':
        case 'receptionAddress':
          return { fontSize: '39px', color: tertiaryColor };
      }
    }
    // Custom blocks
    switch (block.style) {
      case 'primary':
        return { fontSize: '57px', fontWeight: 500, color: mainColor };
      case 'tertiary':
        return { fontSize: '39px', color: tertiaryColor };
      case 'secondary':
      default:
        return { fontSize: '48px', color: secondaryColor };
    }
  };

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
        {textBlocks.map((block) => {
          if (!block.value && block.type !== 'greeting') return null;
          const style = getBlockStyle(block);
          // Greeting: use the resolved per-party greeting
          if (block.type === 'greeting') {
            return (
              <p key={block.id} style={style}>
                {greeting}
              </p>
            );
          }
          return (
            <p key={block.id} style={style}>
              {block.value}
            </p>
          );
        })}
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
