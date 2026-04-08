import { StyleSheet, Font } from '@react-pdf/renderer';

// Register Google Fonts
Font.register({
  family: 'Lora',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/lora/v35/0QI6MX1D_JOuGQbT0gvTJPa787weuxJBkq0.ttf', fontWeight: 400 },
    { src: 'https://fonts.gstatic.com/s/lora/v35/0QI6MX1D_JOuGQbT0gvTJPa787z5vBJBkq0.ttf', fontWeight: 400, fontStyle: 'italic' },
    { src: 'https://fonts.gstatic.com/s/lora/v35/0QI6MX1D_JOuGQbT0gvTJPa787wsuxJBkq0.ttf', fontWeight: 700 },
  ],
});

Font.register({
  family: 'Source Sans 3',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/sourcesans3/v15/nwpBtKy2OAdR1K-IwhWudF-R9QMylBJAV3Bo8Ky462EM.ttf', fontWeight: 400 },
    { src: 'https://fonts.gstatic.com/s/sourcesans3/v15/nwpBtKy2OAdR1K-IwhWudF-R9QMylBJAV3Bo8Kya5GEM.ttf', fontWeight: 400, fontStyle: 'italic' },
    { src: 'https://fonts.gstatic.com/s/sourcesans3/v15/nwpBtKy2OAdR1K-IwhWudF-R9QMylBJAV3Bo8Ky4p2EM.ttf', fontWeight: 600 },
  ],
});

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
    fontFamily: 'Source Sans 3',
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
    fontFamily: 'Lora',
    fontSize: 20,
    fontWeight: 700,
    textAlign: 'center',
    marginBottom: 6,
    color: '#1a1a1a',
  },
  coverAmpersand: {
    fontFamily: 'Lora',
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: 4,
    color: '#8b7355',
  },
  coverDate: {
    fontFamily: 'Source Sans 3',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 20,
    color: '#4a4a4a',
  },
  coverChurch: {
    fontFamily: 'Source Sans 3',
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
    fontFamily: 'Lora',
    fontSize: 14,
    fontWeight: 700,
    marginBottom: 10,
    color: '#1a1a1a',
    textAlign: 'center',
  },
  subTitle: {
    fontFamily: 'Lora',
    fontSize: 12,
    fontWeight: 700,
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
    fontSize: 10.5,
    lineHeight: 1.55,
    fontStyle: 'italic',
    textAlign: 'justify',
  },
  rubric: {
    fontSize: 9,
    fontStyle: 'italic',
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
    fontSize: 10.5,
    fontWeight: 600,
    marginVertical: 3,
  },

  // Songs
  songTitle: {
    fontSize: 9,
    fontWeight: 600,
    color: '#8b7355',
    marginTop: 10,
    marginBottom: 2,
  },
  songName: {
    fontSize: 10,
    fontStyle: 'italic',
  },

  // Prayers
  prayerIntention: {
    fontSize: 10.5,
    lineHeight: 1.5,
    marginBottom: 2,
  },
  prayerRefrain: {
    fontSize: 10.5,
    fontWeight: 600,
    fontStyle: 'italic',
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
    fontSize: 10.5,
    lineHeight: 1.6,
    textAlign: 'center',
    fontStyle: 'italic',
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
