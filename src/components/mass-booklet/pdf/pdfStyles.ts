import { StyleSheet, Font } from '@react-pdf/renderer';
import type { MassBookletStyle } from '@/lib/massBookletSchema';

// Hyphenation callback — disable for Italian
Font.registerHyphenationCallback((word) => [word]);

// Map schema font names to PDF built-in font families
const PDF_HEADING_FONTS: Record<string, string> = {
  'Times-Roman': 'Times-Roman',
  'Times-Bold': 'Times-Bold',
};

const PDF_BODY_FONTS: Record<string, string> = {
  'Helvetica': 'Helvetica',
  'Courier': 'Courier',
};

// Derive italic/bold variants from base font
function headingBoldFont(font: string): string {
  if (font === 'Times-Roman' || font === 'Times-Bold') return 'Times-Bold';
  return font;
}

function bodyItalicFont(font: string): string {
  if (font === 'Helvetica') return 'Helvetica-Oblique';
  if (font === 'Courier') return 'Courier-Oblique';
  return font;
}

function bodyBoldFont(font: string): string {
  if (font === 'Helvetica') return 'Helvetica-Bold';
  if (font === 'Courier') return 'Courier-Bold';
  return font;
}

export const defaultStyle: MassBookletStyle = {
  heading_font: 'Times-Bold',
  body_font: 'Helvetica',
  heading_color: '#1a1a1a',
  subtitle_color: '#8b7355',
  rubric_color: '#8b4513',
  body_size: 10.5,
  heading_size: 14,
  cover_image_url: null,
  cover_image_height: 200,
  cover_layout: 'text_only',
};

export function createStyles(style: MassBookletStyle = defaultStyle) {
  const hFont = PDF_HEADING_FONTS[style.heading_font] || 'Times-Bold';
  const bFont = PDF_BODY_FONTS[style.body_font] || 'Helvetica';
  const hBold = headingBoldFont(hFont);
  const bItalic = bodyItalicFont(bFont);
  const bBold = bodyBoldFont(bFont);

  return StyleSheet.create({
    // Page
    page: {
      width: '148.5mm',
      height: '210mm',
      paddingTop: '15mm',
      paddingBottom: '15mm',
      paddingLeft: '12mm',
      paddingRight: '10mm',
      fontFamily: bFont,
      fontSize: style.body_size,
      lineHeight: 1.5,
      color: '#1a1a1a',
    },
    pageBlank: {
      width: '148.5mm',
      height: '210mm',
    },

    // Cover
    coverPage: {
      width: '148.5mm',
      height: '210mm',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: '20mm',
    },
    coverCross: {
      fontSize: 28,
      marginBottom: 24,
      color: style.subtitle_color,
    },
    coverTitle: {
      fontFamily: hBold,
      fontSize: 20,
      textAlign: 'center',
      marginBottom: 6,
      color: style.heading_color,
    },
    coverAmpersand: {
      fontFamily: bItalic,
      fontSize: 14,
      textAlign: 'center',
      marginVertical: 4,
      color: style.subtitle_color,
    },
    coverDate: {
      fontFamily: bFont,
      fontSize: 11,
      textAlign: 'center',
      marginTop: 20,
      color: '#4a4a4a',
    },
    coverChurch: {
      fontFamily: bFont,
      fontSize: 10,
      textAlign: 'center',
      marginTop: 4,
      color: '#6b6b6b',
    },
    coverLine: {
      width: 40,
      height: 1,
      backgroundColor: style.subtitle_color,
      marginVertical: 16,
    },

    // Section titles
    sectionTitle: {
      fontFamily: hBold,
      fontSize: style.heading_size,
      marginBottom: 10,
      color: style.heading_color,
      textAlign: 'center',
    },
    subTitle: {
      fontFamily: hBold,
      fontSize: style.heading_size - 2,
      marginBottom: 6,
      marginTop: 14,
      color: style.heading_color,
    },

    // Body text
    body: {
      fontSize: style.body_size,
      lineHeight: 1.55,
      textAlign: 'justify',
    },
    bodyItalic: {
      fontFamily: bItalic,
      fontSize: style.body_size,
      lineHeight: 1.55,
      textAlign: 'justify',
    },
    rubric: {
      fontFamily: bItalic,
      fontSize: style.body_size - 1.5,
      color: style.rubric_color,
      marginBottom: 4,
      marginTop: 8,
    },
    reference: {
      fontSize: style.body_size - 1.5,
      color: '#6b6b6b',
      marginBottom: 6,
    },
    response: {
      fontFamily: bBold,
      fontSize: style.body_size,
      marginVertical: 3,
    },

    // Songs
    songTitle: {
      fontFamily: bBold,
      fontSize: style.body_size - 1.5,
      color: style.subtitle_color,
      marginTop: 10,
      marginBottom: 2,
    },
    songName: {
      fontFamily: bItalic,
      fontSize: style.body_size - 0.5,
    },

    // Prayers
    prayerIntention: {
      fontSize: style.body_size,
      lineHeight: 1.5,
      marginBottom: 2,
    },
    prayerRefrain: {
      fontFamily: bItalic,
      fontSize: style.body_size,
      marginBottom: 8,
      textAlign: 'center',
    },

    // Spacers
    spacerSm: { height: 8 },
    spacerMd: { height: 16 },
    spacerLg: { height: 24 },

    // Separator line
    separator: {
      width: '100%',
      height: 0.5,
      backgroundColor: '#d4c5a0',
      marginVertical: 12,
    },

    // Thanks
    thanksText: {
      fontFamily: bItalic,
      fontSize: style.body_size,
      lineHeight: 1.6,
      textAlign: 'center',
    },

    // Page number
    pageNumber: {
      position: 'absolute',
      bottom: '8mm',
      left: 0,
      right: 0,
      textAlign: 'center',
      fontSize: 8,
      color: '#999',
    },

    // Cover image
    coverImage: {
      width: '100%',
      objectFit: 'cover' as any,
    },
  });
}

// Legacy default export for backward compat
const s = createStyles();
export default s;
