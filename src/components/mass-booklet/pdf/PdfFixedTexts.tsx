import { View, Text } from '@react-pdf/renderer';
import { createStyles } from './pdfStyles';
import liturgiaData from '@/data/liturgia.json';
import type { LiturgiaData, MassBookletContent, MassBookletStyle } from '@/lib/massBookletSchema';

const lit = liturgiaData as unknown as LiturgiaData;

function r(text: string, p1: string, p2: string): string {
  return text
    .replace(/\{\{partner1\}\}/g, p1 || '___')
    .replace(/\{\{partner2\}\}/g, p2 || '___')
    .replace(/\{\{name\}\}/g, '___');
}

interface Props {
  content: MassBookletContent;
  partner1: string;
  partner2: string;
  style?: MassBookletStyle;
}

export function PdfRiteIntro({ content, partner1, partner2, style }: Props) {
  const s = createStyles(style);
  const ft = lit.fixed_texts;
  return (
    <View>
      <Text style={s.sectionTitle} minPresenceAhead={60}>Riti di Introduzione</Text>
      <View style={s.separator} />

      {content.songs.entrance ? (
        <View>
          <Text style={s.songTitle}>CANTO D'INGRESSO</Text>
          <Text style={s.songName}>{content.songs.entrance}</Text>
          <View style={s.spacerMd} />
        </View>
      ) : null}

      <Text style={s.rubric}>Il celebrante dice:</Text>
      <Text style={s.response}>{ft.rite_intro.sign_of_cross}</Text>
      <View style={s.spacerSm} />
      <Text style={s.body}>{ft.rite_intro.greeting}</Text>
      <Text style={s.response}>{ft.rite_intro.response_greeting}</Text>
      <View style={s.spacerMd} />

      <Text style={s.subTitle} minPresenceAhead={40}>Memoria del Battesimo</Text>
      <Text style={s.body}>{r(ft.baptism_memory, partner1, partner2)}</Text>
    </View>
  );
}

export function PdfConsent({ partner1, partner2, style }: { partner1: string; partner2: string; style?: MassBookletStyle }) {
  const s = createStyles(style);
  const ft = lit.fixed_texts;
  return (
    <View>
      <Text style={s.sectionTitle} minPresenceAhead={60}>Rito del Matrimonio</Text>
      <View style={s.separator} />

      <Text style={s.subTitle} minPresenceAhead={40}>Interrogazioni</Text>
      <Text style={s.body}>{r(ft.consent_questions.intro, partner1, partner2)}</Text>
      <View style={s.spacerSm} />
      <Text style={s.rubric}>Il celebrante interroga gli sposi:</Text>
      <Text style={s.body}>{r(ft.consent_questions.question_freedom, partner1, partner2)}</Text>
      <Text style={s.response}>Sì.</Text>
      <View style={s.spacerSm} />
      <Text style={s.body}>{r(ft.consent_questions.question_faithfulness, partner1, partner2)}</Text>
      <Text style={s.response}>Sì.</Text>
      <View style={s.spacerSm} />
      <Text style={s.body}>{r(ft.consent_questions.question_children, partner1, partner2)}</Text>
      <Text style={s.response}>Sì.</Text>

      <View style={s.spacerMd} />
      <Text style={s.subTitle} minPresenceAhead={40}>Consenso</Text>
      <Text style={s.rubric}>Lo sposo dice:</Text>
      <Text style={s.body}>{r(ft.consent_formula.groom, partner1, partner2)}</Text>
      <View style={s.spacerSm} />
      <Text style={s.rubric}>La sposa dice:</Text>
      <Text style={s.body}>{r(ft.consent_formula.bride, partner1, partner2)}</Text>
      <View style={s.spacerSm} />
      <Text style={s.rubric}>Il celebrante dice:</Text>
      <Text style={s.body}>{ft.consent_acceptance}</Text>

      <View style={s.spacerMd} />
      <Text style={s.subTitle} minPresenceAhead={40}>Benedizione e Scambio degli Anelli</Text>
      <Text style={s.body}>{ft.rings_blessing}</Text>
      <View style={s.spacerSm} />
      <Text style={s.rubric}>Ciascuno degli sposi dice mettendo l'anello:</Text>
      <Text style={s.body}>{r(ft.ring_exchange.formula, partner1, partner2)}</Text>
    </View>
  );
}

export function PdfOurFather() {
  const s = createStyles();
  const ft = lit.fixed_texts;
  return (
    <View wrap={false}>
      <Text style={s.subTitle}>Padre Nostro</Text>
      <Text style={s.body}>{ft.our_father}</Text>
    </View>
  );
}
