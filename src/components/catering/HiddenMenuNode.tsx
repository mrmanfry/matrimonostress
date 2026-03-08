import type { ImageTransform, EdgeStyle } from "@/components/print/PrintInvitationEditor";
import type { MenuData } from "./MenuComposer";
import type { MenuFormat } from "./MenuDesignStep";

interface HiddenMenuNodeProps {
  targetLabel: string; // table name or guest name
  dietaryBadge?: string | null; // only for placecard mode
  fontFamily: string;
  backgroundImageUrl: string | null;
  menuData: MenuData;
  partnerNames: string;
  imageTransform: ImageTransform;
  edgeStyle: EdgeStyle;
  format: MenuFormat;
}

// A5 at 300 DPI = 1748 x 2480, A6 = 1240 x 1748
const DIMS = {
  a5: { w: 1748, h: 2480 },
  a6: { w: 1240, h: 1748 },
};

const HiddenMenuNode = ({
  targetLabel,
  dietaryBadge,
  fontFamily,
  backgroundImageUrl,
  menuData,
  partnerNames,
  imageTransform,
  edgeStyle,
  format,
}: HiddenMenuNodeProps) => {
  const { w: W, h: H } = DIMS[format];
  const scale = format === 'a5' ? 1 : 0.71; // scale text sizes for A6
  const s = (px: number) => Math.round(px * scale);

  return (
    <div
      id="hidden-menu-node"
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
      {/* TOP: Photo (40%) */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '35%', overflow: 'hidden', backgroundColor: '#ffffff' }}>
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

      {/* BOTTOM: Menu text (65%) */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: '65%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-start',
          padding: `${s(50)}px ${s(100)}px ${s(40)}px`,
          textAlign: 'center',
        }}
      >
        {/* Target label (table or guest name) */}
        <p style={{ fontSize: `${s(36)}px`, letterSpacing: '0.05em', color: '#999', marginBottom: `${s(16)}px` }}>
          {targetLabel}
        </p>
        {dietaryBadge && (
          <p style={{
            fontSize: `${s(28)}px`,
            color: '#888',
            backgroundColor: '#f0f0f0',
            padding: `${s(6)}px ${s(20)}px`,
            borderRadius: `${s(12)}px`,
            marginBottom: `${s(16)}px`,
          }}>
            {dietaryBadge}
          </p>
        )}

        {/* Menu title */}
        <p style={{ fontSize: `${s(56)}px`, fontWeight: 600, color: '#1a1a1a', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
          {menuData.title}
        </p>
        <div style={{ width: `${s(80)}px`, height: '2px', backgroundColor: '#ccc', margin: `${s(20)}px 0` }} />

        {/* Courses */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: `${s(24)}px`, width: '100%' }}>
          {menuData.courses.filter(c => c.items.length > 0).map((course) => (
            <div key={course.id}>
              <p style={{
                fontSize: `${s(30)}px`,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                color: '#999',
                marginBottom: `${s(8)}px`,
              }}>
                {course.category}
              </p>
              {course.items.map((item, i) => (
                <p key={i} style={{ fontSize: `${s(36)}px`, color: '#333', lineHeight: 1.5 }}>
                  {item}
                </p>
              ))}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ marginTop: `${s(30)}px` }}>
          <div style={{ width: `${s(60)}px`, height: '1px', backgroundColor: '#ddd', margin: `0 auto ${s(12)}px` }} />
          <p style={{ fontSize: `${s(28)}px`, color: '#bbb', letterSpacing: '0.05em' }}>{partnerNames}</p>
        </div>
      </div>
    </div>
  );
};

export default HiddenMenuNode;
