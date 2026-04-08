import { View, Text } from '@react-pdf/renderer';
import { createStyles } from './pdfStyles';
import type { LiturgiaReading, LiturgiaPsalm, LiturgiaData, MassBookletStyle } from '@/lib/massBookletSchema';
import type { MassBookletContent } from '@/lib/massBookletSchema';
import liturgiaData from '@/data/liturgia.json';

const lit = liturgiaData as unknown as LiturgiaData;

interface Props {
  content: MassBookletContent;
  style?: MassBookletStyle;
}

function ReadingBlock({ label, source, reference, text, style }: { label: string; source: string; reference: string; text: string; style?: MassBookletStyle }) {
  const s = createStyles(style);
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={s.subTitle} minPresenceAhead={40}>{label}</Text>
      {source ? <Text style={s.rubric}>{source}</Text> : null}
      {reference ? <Text style={s.reference}>{reference}</Text> : null}
      <Text style={s.body}>{text}</Text>
    </View>
  );
}

function PsalmBlock({ psalm, style }: { psalm: LiturgiaPsalm; style?: MassBookletStyle }) {
  const s = createStyles(style);
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={s.subTitle} minPresenceAhead={40}>Salmo Responsoriale</Text>
      <Text style={s.reference}>{psalm.reference}</Text>
      <Text style={s.prayerRefrain}>{psalm.refrain}</Text>
      {psalm.verses.map((v, i) => (
        <View key={i}>
          <Text style={s.body}>{v}</Text>
          <Text style={s.prayerRefrain}>{psalm.refrain}</Text>
        </View>
      ))}
    </View>
  );
}

export default function PdfReadingSection({ content, style }: Props) {
  const s = createStyles(style);
  const r = content.readings;

  let firstReading: LiturgiaReading | undefined;
  let firstReadingCustom = false;
  if (r.use_custom_first_reading && r.first_reading_custom) {
    firstReadingCustom = true;
  } else if (r.first_reading) {
    firstReading = lit.readings.first_reading.find(x => x.id === r.first_reading) as LiturgiaReading | undefined;
  }

  let psalm: LiturgiaPsalm | undefined;
  let psalmCustom = false;
  if (r.use_custom_psalm && r.psalm_custom) {
    psalmCustom = true;
  } else if (r.psalm) {
    psalm = lit.readings.responsorial_psalm.find(x => x.id === r.psalm) as LiturgiaPsalm | undefined;
  }

  let secondReading: LiturgiaReading | undefined;
  let secondReadingCustom = false;
  if (r.use_custom_second_reading && r.second_reading_custom) {
    secondReadingCustom = true;
  } else if (r.second_reading) {
    secondReading = lit.readings.second_reading.find(x => x.id === r.second_reading) as LiturgiaReading | undefined;
  }

  let gospel: LiturgiaReading | undefined;
  let gospelCustom = false;
  if (r.use_custom_gospel && r.gospel_custom) {
    gospelCustom = true;
  } else if (r.gospel) {
    gospel = lit.readings.gospel.find(x => x.id === r.gospel) as LiturgiaReading | undefined;
  }

  return (
    <View>
      <Text style={s.sectionTitle} minPresenceAhead={60}>Liturgia della Parola</Text>
      <View style={s.separator} />

      {firstReadingCustom ? (
        <ReadingBlock label="Prima Lettura" source="" reference="" text={r.first_reading_custom!} style={style} />
      ) : firstReading ? (
        <ReadingBlock label="Prima Lettura" source={firstReading.source} reference={firstReading.reference} text={firstReading.text} style={style} />
      ) : null}

      {psalmCustom ? (
        <View style={{ marginBottom: 14 }}>
          <Text style={s.subTitle} minPresenceAhead={40}>Salmo Responsoriale</Text>
          <Text style={s.body}>{r.psalm_custom}</Text>
        </View>
      ) : psalm ? (
        <PsalmBlock psalm={psalm} style={style} />
      ) : null}

      {secondReadingCustom ? (
        <ReadingBlock label="Seconda Lettura" source="" reference="" text={r.second_reading_custom!} style={style} />
      ) : secondReading ? (
        <ReadingBlock label="Seconda Lettura" source={secondReading.source} reference={secondReading.reference} text={secondReading.text} style={style} />
      ) : null}

      {gospelCustom ? (
        <ReadingBlock label="Vangelo" source="" reference="" text={r.gospel_custom!} style={style} />
      ) : gospel ? (
        <ReadingBlock label="Vangelo" source={gospel.source} reference={gospel.reference} text={gospel.text} style={style} />
      ) : null}
    </View>
  );
}
