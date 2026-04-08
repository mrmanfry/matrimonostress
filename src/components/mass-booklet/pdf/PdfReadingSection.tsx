import { View, Text } from '@react-pdf/renderer';
import s from './pdfStyles';
import type { LiturgiaReading, LiturgiaPsalm, LiturgiaData } from '@/lib/massBookletSchema';
import type { MassBookletContent } from '@/lib/massBookletSchema';
import liturgiaData from '@/data/liturgia.json';

const lit = liturgiaData as unknown as LiturgiaData;

interface Props {
  content: MassBookletContent;
}

function ReadingBlock({ label, source, reference, text }: { label: string; source: string; reference: string; text: string }) {
  return (
    <View wrap={false} style={{ marginBottom: 14 }}>
      <Text style={s.subTitle}>{label}</Text>
      <Text style={s.rubric}>{source}</Text>
      <Text style={s.reference}>{reference}</Text>
      <Text style={s.body}>{text}</Text>
    </View>
  );
}

function PsalmBlock({ psalm }: { psalm: LiturgiaPsalm }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={s.subTitle}>Salmo Responsoriale</Text>
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

export default function PdfReadingSection({ content }: Props) {
  const r = content.readings;

  // First reading
  let firstReading: LiturgiaReading | undefined;
  let firstReadingCustom = false;
  if (r.use_custom_first_reading && r.first_reading_custom) {
    firstReadingCustom = true;
  } else if (r.first_reading) {
    firstReading = lit.readings.first_reading.find(x => x.id === r.first_reading) as LiturgiaReading | undefined;
  }

  // Psalm
  let psalm: LiturgiaPsalm | undefined;
  let psalmCustom = false;
  if (r.use_custom_psalm && r.psalm_custom) {
    psalmCustom = true;
  } else if (r.psalm) {
    psalm = lit.readings.responsorial_psalm.find(x => x.id === r.psalm) as LiturgiaPsalm | undefined;
  }

  // Second reading (optional)
  let secondReading: LiturgiaReading | undefined;
  let secondReadingCustom = false;
  if (r.use_custom_second_reading && r.second_reading_custom) {
    secondReadingCustom = true;
  } else if (r.second_reading) {
    secondReading = lit.readings.second_reading.find(x => x.id === r.second_reading) as LiturgiaReading | undefined;
  }

  // Gospel
  let gospel: LiturgiaReading | undefined;
  let gospelCustom = false;
  if (r.use_custom_gospel && r.gospel_custom) {
    gospelCustom = true;
  } else if (r.gospel) {
    gospel = lit.readings.gospel.find(x => x.id === r.gospel) as LiturgiaReading | undefined;
  }

  return (
    <View>
      <Text style={s.sectionTitle}>Liturgia della Parola</Text>
      <View style={s.separator} />

      {/* First Reading */}
      {firstReadingCustom ? (
        <ReadingBlock label="Prima Lettura" source="" reference="" text={r.first_reading_custom!} />
      ) : firstReading ? (
        <ReadingBlock label="Prima Lettura" source={firstReading.source} reference={firstReading.reference} text={firstReading.text} />
      ) : null}

      {/* Psalm */}
      {psalmCustom ? (
        <View style={{ marginBottom: 14 }}>
          <Text style={s.subTitle}>Salmo Responsoriale</Text>
          <Text style={s.body}>{r.psalm_custom}</Text>
        </View>
      ) : psalm ? (
        <PsalmBlock psalm={psalm} />
      ) : null}

      {/* Second Reading */}
      {secondReadingCustom ? (
        <ReadingBlock label="Seconda Lettura" source="" reference="" text={r.second_reading_custom!} />
      ) : secondReading ? (
        <ReadingBlock label="Seconda Lettura" source={secondReading.source} reference={secondReading.reference} text={secondReading.text} />
      ) : null}

      {/* Gospel */}
      {gospelCustom ? (
        <ReadingBlock label="Vangelo" source="" reference="" text={r.gospel_custom!} />
      ) : gospel ? (
        <ReadingBlock label="Vangelo" source={gospel.source} reference={gospel.reference} text={gospel.text} />
      ) : null}
    </View>
  );
}
