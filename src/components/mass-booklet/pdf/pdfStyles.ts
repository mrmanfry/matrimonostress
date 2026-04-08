import { StyleSheet, Font } from '@react-pdf/renderer';

// Use built-in PDF fonts to avoid network dependency issues.
// 'Times-Roman' family replaces Lora (serif headings).
// 'Helvetica' family replaces Source Sans 3 (sans-serif body).
// Built-in fonts: Times-Roman, Times-Bold, Times-Italic, Times-BoldItalic,
//                 Helvetica, Helvetica-Bold, Helvetica-Oblique

// Hyphenation callback — disable for Italian
Font.registerHyphenationCallback((word) => [word]);

const s = StyleSheet.create({
  // Page
  page: {
    width: '148.5mm',
    height: '210mm',
    paddingTop: '15mm',
    paddingBottom: '15mm',
    paddingLeft: '12mm',
    paddingRight: '10mm',
    fontFamily: 'Helvetica',
    fontSize: 10.5,
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
    color: '#8b7355',
  },
  coverTitle: {
    fontFamily: 'Times-Bold',
    fontSize: 20,
    textAlign: 'center',
    marginBottom: 6,
    color: '#1a1a1a',
  },
  coverAmpersand: {
    fontFamily: 'Times-Italic',
    fontSize: 14,
    textAlign: 'center',
    marginVertical: 4,
    color: '#8b7355',
  },
  coverDate: {
    fontFamily: 'Helvetica',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 20,
    color: '#4a4a4a',
  },
  coverChurch: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    textAlign: 'center',
    marginTop: 4,
    color: '#6b6b6b',
  },
  coverLine: {
    width: 40,
    height: 1,
    backgroundColor: '#c9b99a',
    marginVertical: 16,
  },

  // Section titles
  sectionTitle: {
    fontFamily: 'Times-Bold',
    fontSize: 14,
    marginBottom: 10,
    color: '#1a1a1a',
    textAlign: 'center',
  },
  subTitle: {
    fontFamily: 'Times-Bold',
    fontSize: 12,
    marginBottom: 6,
    marginTop: 14,
    color: '#1a1a1a',
  },

  // Body text
  body: {
    fontSize: 10.5,
    lineHeight: 1.55,
    textAlign: 'justify',
  },
  bodyItalic: {
    fontFamily: 'Helvetica-Oblique',
    fontSize: 10.5,
    lineHeight: 1.55,
    textAlign: 'justify',
  },
  rubric: {
    fontFamily: 'Helvetica-Oblique',
    fontSize: 9,
    color: '#8b4513',
    marginBottom: 4,
    marginTop: 8,
  },
  reference: {
    fontSize: 9,
    color: '#6b6b6b',
    marginBottom: 6,
  },
  response: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 10.5,
    marginVertical: 3,
  },

  // Songs
  songTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
    color: '#8b7355',
    marginTop: 10,
    marginBottom: 2,
  },
  songName: {
    fontFamily: 'Helvetica-Oblique',
    fontSize: 10,
  },

  // Prayers
  prayerIntention: {
    fontSize: 10.5,
    lineHeight: 1.5,
    marginBottom: 2,
  },
  prayerRefrain: {
    fontFamily: 'Helvetica-Oblique',
    fontSize: 10.5,
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
    fontFamily: 'Helvetica-Oblique',
    fontSize: 10.5,
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
});

export default s;
