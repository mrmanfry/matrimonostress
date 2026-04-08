import { View, Text } from '@react-pdf/renderer';
import s from './pdfStyles';
import type { MassBookletContent } from '@/lib/massBookletSchema';

interface Props {
  content: MassBookletContent;
}

export function PdfPrayers({ content }: Props) {
  const { prayers } = content;
  if (!prayers.intentions.length) return null;

  return (
    <View>
      <Text style={s.subTitle}>Preghiera dei Fedeli</Text>
      <Text style={s.rubric}>Dopo ogni intenzione l'assemblea risponde:</Text>
      <Text style={s.prayerRefrain}>{prayers.refrain}</Text>
      <View style={s.spacerSm} />
      {prayers.intentions.map((intention, i) => (
        <View key={i}>
          <Text style={s.prayerIntention}>{intention}</Text>
          <Text style={s.prayerRefrain}>{prayers.refrain}</Text>
        </View>
      ))}
    </View>
  );
}

export function PdfThanks({ content }: Props) {
  if (!content.thanks.text) return null;

  return (
    <View>
      <Text style={s.sectionTitle}>Ringraziamenti</Text>
      <View style={s.separator} />
      <Text style={s.thanksText}>{content.thanks.text}</Text>
    </View>
  );
}

export function PdfSongBlock({ label, name }: { label: string; name: string }) {
  if (!name) return null;
  return (
    <View>
      <Text style={s.songTitle}>{label}</Text>
      <Text style={s.songName}>{name}</Text>
    </View>
  );
}
