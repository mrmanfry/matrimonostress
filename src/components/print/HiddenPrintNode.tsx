import { QRCodeSVG } from "qrcode.react";
import type { ImageTransform, EdgeStyle, QrPosition } from "./PrintInvitationEditor";
import type { TextBlock } from "./PrintDesignStep";
import { FONT_MAP } from "./PrintDesignStep";

interface HiddenPrintNodeProps {
  displayName: string;
  syncToken: string;
  fontFamily: string;
  backgroundImageUrl: string | null;
  imageTransform: ImageTransform;
  edgeStyle: EdgeStyle;
  hasPhoto: boolean;
  textBlocks: TextBlock[];
  qrPosition: QrPosition;
  textColor: string;
  greeting: string;
  width?: number;
  height?: number;
}

const HiddenPrintNode = ({
  displayName,
  syncToken,
  fontFamily,
  backgroundImageUrl,
  imageTransform,
  edgeStyle,
  hasPhoto,
  textBlocks,
  qrPosition,
  textColor,
  greeting,
  width = 1748,
  height = 2480,
}: HiddenPrintNodeProps) => {
  const W = width;
  const H = height;
  const rsvpUrl = syncToken ? `https://wedsapp.it/rsvp/${syncToken}` : '';
  const mainColor = textColor || '#1a1a1a';
  const secondaryColor = textColor === '#FFFFFF' ? 'rgba(255,255,255,0.7)' : textColor === '#1a1a1a' ? '#888' : `${textColor}99`;
  const tertiaryColor = textColor === '#FFFFFF' ? 'rgba(255,255,255,0.5)' : textColor === '#1a1a1a' ? '#999' : `${textColor}77`;

  const getBlockStyle = (block: TextBlock): React.CSSProperties => {
    const blockFont = block.fontOverride ? FONT_MAP[block.fontOverride] : fontFamily;
    const blockMain = block.colorOverride || mainColor;
    const blockSecondary = block.colorOverride
      ? (block.colorOverride === '#FFFFFF' ? 'rgba(255,255,255,0.7)' : `${block.colorOverride}99`)
      : secondaryColor;
    const blockTertiary = block.colorOverride
      ? (block.colorOverride === '#FFFFFF' ? 'rgba(255,255,255,0.5)' : `${block.colorOverride}77`)
      : tertiaryColor;

    if (block.type !== 'custom') {
      switch (block.type) {
        case 'greeting':
          return { fontSize: '48px', letterSpacing: '0.05em', color: blockSecondary, fontFamily: blockFont };
        case 'names':
          return { fontSize: '79px', fontWeight: 600, color: blockMain, lineHeight: 1.3, fontFamily: blockFont };
        case 'announcement':
          return { fontSize: '48px', color: blockSecondary, fontFamily: blockFont };
        case 'dateText':
          return { fontSize: '57px', fontWeight: 500, color: blockMain, textTransform: 'capitalize', fontFamily: blockFont };
        case 'timePrefix_time':
          return { fontSize: '48px', color: blockSecondary, fontFamily: blockFont };
        case 'venuePrefix':
        case 'receptionPrefix':
          return { fontSize: '44px', color: blockSecondary, fontFamily: blockFont };
        case 'ceremonyVenue':
        case 'receptionVenue':
          return { fontSize: '57px', fontWeight: 500, color: blockMain, fontFamily: blockFont };
        case 'ceremonyAddress':
        case 'receptionAddress':
          return { fontSize: '39px', color: blockTertiary, fontFamily: blockFont };
      }
    }
    // Custom blocks
    switch (block.style) {
      case 'primary':
        return { fontSize: '57px', fontWeight: 500, color: blockMain, fontFamily: blockFont };
      case 'tertiary':
        return { fontSize: '39px', color: blockTertiary, fontFamily: blockFont };
      case 'secondary':
      default:
        return { fontSize: '48px', color: blockSecondary, fontFamily: blockFont };
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

      {/* Each text block positioned individually */}
      {textBlocks.map((block) => {
        if (!block.value && block.type !== 'greeting') return null;
        const style = getBlockStyle(block);
        const displayValue = block.type === 'greeting' ? greeting : block.value;

        return (
          <div
            key={block.id}
            style={{
              position: 'absolute',
              left: `${block.x}%`,
              top: `${block.y}%`,
              transform: 'translateX(-50%)',
              textAlign: (block.textAlign || 'center') as any,
              ...(block.widthPct ? {
                width: `${block.widthPct}%`,
                whiteSpace: 'normal' as const,
                wordWrap: 'break-word' as const,
                ...(block.lineHeight ? { lineHeight: block.lineHeight } : {}),
              } : {
                whiteSpace: 'nowrap' as const,
              }),
            }}
          >
            <p style={style}>
              {displayValue}
            </p>
          </div>
        );
      })}

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
