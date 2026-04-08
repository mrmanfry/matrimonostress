import { Page, View, Text } from '@react-pdf/renderer';
import s from './pdfStyles';

interface Props {
  partner1: string;
  partner2: string;
  dateText: string;
  churchName: string;
}

export default function PdfCoverPage({ partner1, partner2, dateText, churchName }: Props) {
  return (
    <Page size={[420.94, 595.28]} style={s.coverPage}>
      <Text style={s.coverCross}>✝</Text>
      <Text style={s.coverTitle}>{partner1 || '...'}</Text>
      <Text style={s.coverAmpersand}>&amp;</Text>
      <Text style={s.coverTitle}>{partner2 || '...'}</Text>
      <View style={s.coverLine} />
      <Text style={s.coverDate}>{dateText}</Text>
      {churchName ? <Text style={s.coverChurch}>{churchName}</Text> : null}
    </Page>
  );
}
