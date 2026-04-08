import { Document, Page, View, Text } from '@react-pdf/renderer';
import s from './pdfStyles';
import type { MassBookletContent } from '@/lib/massBookletSchema';
import PdfCoverPage from './PdfCoverPage';
import PdfReadingSection from './PdfReadingSection';
import { PdfRiteIntro, PdfConsent, PdfOurFather } from './PdfFixedTexts';
import { PdfPrayers, PdfThanks, PdfSongBlock } from './PdfPrayersSection';

interface Props {
  content: MassBookletContent;
  partner1: string;
  partner2: string;
}

const A5: [number, number] = [420.94, 595.28]; // 148.5mm x 210mm in points

export default function BookletPdfDocument({ content, partner1, partner2 }: Props) {
  const isEucharist = content.rite_type === 'messa_eucaristia';

  return (
    <Document title={`Libretto Messa - ${partner1} & ${partner2}`} author="MatrimonoStress">
      {/* Cover */}
      <PdfCoverPage
        partner1={partner1}
        partner2={partner2}
        dateText={content.ceremony_date_text}
        churchName={content.church_name}
      />

      {/* Content pages */}
      <Page size={A5} style={s.page}>
        {/* Rite Intro */}
        <PdfRiteIntro content={content} partner1={partner1} partner2={partner2} />

        <View style={s.spacerLg} />

        {/* Readings */}
        <PdfReadingSection content={content} />

        <View style={s.spacerLg} />

        {/* Consent & Rings */}
        <PdfConsent partner1={partner1} partner2={partner2} />

        <View style={s.spacerLg} />

        {/* Prayers of the Faithful */}
        <PdfPrayers content={content} />

        <View style={s.spacerLg} />

        {/* Eucharistic Liturgy (conditional) */}
        {isEucharist && (
          <View>
            <Text style={s.sectionTitle}>Liturgia Eucaristica</Text>
            <View style={s.separator} />

            <PdfSongBlock label="CANTO D'OFFERTORIO" name={content.songs.offertory} />
            <View style={s.spacerMd} />

            {content.songs.holy ? (
              <View>
                <Text style={s.songTitle}>SANTO</Text>
                <Text style={s.songName}>{content.songs.holy}</Text>
                <View style={s.spacerSm} />
              </View>
            ) : null}

            <PdfOurFather />
            <View style={s.spacerMd} />

            {content.songs.peace ? (
              <View>
                <Text style={s.songTitle}>SEGNO DELLA PACE</Text>
                <Text style={s.songName}>{content.songs.peace}</Text>
                <View style={s.spacerSm} />
              </View>
            ) : null}

            {content.songs.fraction ? (
              <View>
                <Text style={s.songTitle}>AGNELLO DI DIO</Text>
                <Text style={s.songName}>{content.songs.fraction}</Text>
                <View style={s.spacerSm} />
              </View>
            ) : null}

            <PdfSongBlock label="CANTO DI COMUNIONE" name={content.songs.communion} />
            {content.songs.communion_2 ? (
              <PdfSongBlock label="CANTO DI COMUNIONE (2)" name={content.songs.communion_2} />
            ) : null}
          </View>
        )}

        {!isEucharist && (
          <View>
            <PdfOurFather />
          </View>
        )}

        <View style={s.spacerLg} />

        {/* Thanks */}
        <PdfThanks content={content} />

        <View style={s.spacerLg} />

        {/* Gloria */}
        {content.songs.gloria ? (
          <PdfSongBlock label="GLORIA" name={content.songs.gloria} />
        ) : null}

        {/* Exit song */}
        <PdfSongBlock label="CANTO FINALE" name={content.songs.exit} />

        {/* Page number */}
        <Text style={s.pageNumber} render={({ pageNumber }) => `${pageNumber}`} fixed />
      </Page>
    </Document>
  );
}
