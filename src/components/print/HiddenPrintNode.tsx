import { QRCodeSVG } from "qrcode.react";

interface HiddenPrintNodeProps {
  displayName: string;
  syncToken: string;
  welcomeText: string;
  fontFamily: string;
  backgroundImageUrl: string | null;
}

const HiddenPrintNode = ({
  displayName,
  syncToken,
  welcomeText,
  fontFamily,
  backgroundImageUrl,
}: HiddenPrintNodeProps) => {
  const rsvpUrl = syncToken
    ? `https://wedsapp.it/rsvp/${syncToken}`
    : '';
  const shortLink = syncToken
    ? `wedsapp.it/rsvp/${syncToken.substring(0, 8)}`
    : '';

  return (
    <div
      id="hidden-print-node"
      style={{
        position: 'fixed',
        top: '-9999px',
        left: '-9999px',
        width: '400px',
        // A5 ratio: 1/1.414
        height: `${Math.round(400 * 1.414)}px`,
        overflow: 'hidden',
        backgroundColor: '#ffffff',
        fontFamily,
      }}
    >
      {/* Background image */}
      {backgroundImageUrl && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url(${backgroundImageUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
      )}

      {/* Gradient overlay for readability */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: backgroundImageUrl
            ? 'linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.05) 40%, rgba(255,255,255,0.6) 75%, rgba(255,255,255,0.9) 100%)'
            : 'transparent',
        }}
      />

      {/* Content */}
      <div
        style={{
          position: 'relative',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '32px 24px 20px',
        }}
      >
        {/* Welcome text */}
        <div style={{ textAlign: 'center', paddingTop: '24px' }}>
          <p
            style={{
              fontSize: '18px',
              lineHeight: '1.5',
              color: backgroundImageUrl ? '#ffffff' : '#1a1a1a',
              textShadow: backgroundImageUrl ? '0 1px 4px rgba(0,0,0,0.4)' : 'none',
              whiteSpace: 'pre-line',
            }}
          >
            {welcomeText}
          </p>
        </div>

        {/* Footer block with family name + QR */}
        <div
          style={{
            backgroundColor: 'rgba(255,255,255,0.95)',
            borderRadius: '12px',
            padding: '16px',
            textAlign: 'center',
          }}
        >
          <p
            style={{
              fontSize: '14px',
              fontWeight: 600,
              color: '#333',
              marginBottom: '12px',
              fontStyle: 'italic',
            }}
          >
            Gentilissima {displayName}
          </p>

          {syncToken ? (
            <>
              <div
                style={{
                  display: 'inline-block',
                  padding: '8px',
                  backgroundColor: '#ffffff',
                  borderRadius: '8px',
                }}
              >
                <QRCodeSVG value={rsvpUrl} size={100} />
              </div>
              <div style={{ marginTop: '8px' }}>
                <p
                  style={{
                    fontSize: '8px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    color: '#888',
                  }}
                >
                  Oppure visita il link:
                </p>
                <p
                  style={{
                    fontSize: '10px',
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    color: '#111',
                  }}
                >
                  {shortLink}
                </p>
              </div>
            </>
          ) : (
            <div
              style={{
                width: '100px',
                height: '100px',
                backgroundColor: '#e5e5e5',
                borderRadius: '8px',
                margin: '0 auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px',
                color: '#999',
              }}
            >
              Nessun QR
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HiddenPrintNode;
