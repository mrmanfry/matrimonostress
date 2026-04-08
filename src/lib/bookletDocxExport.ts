import {
  Document, Packer, Paragraph, TextRun, AlignmentType, BorderStyle,
} from 'docx';
import type { MassBookletContent, LiturgiaData, LiturgiaReading, LiturgiaPsalm, MassBookletStyle } from './massBookletSchema';
import liturgiaData from '@/data/liturgia.json';

const lit = liturgiaData as unknown as LiturgiaData;

// A5 in DXA: 148.5mm × 210mm => 1mm = 56.7 DXA
const A5_W = 8419; // 148.5mm
const A5_H = 11906; // 210mm

// Map PDF font names to DOCX font names
const DOCX_HEADING_FONT: Record<string, string> = {
  'Times-Roman': 'Times New Roman',
  'Times-Bold': 'Times New Roman',
};
const DOCX_BODY_FONT: Record<string, string> = {
  'Helvetica': 'Arial',
  'Courier': 'Courier New',
};

function getDocxFonts(style?: MassBookletStyle) {
  const hf = DOCX_HEADING_FONT[style?.heading_font || 'Times-Bold'] || 'Times New Roman';
  const bf = DOCX_BODY_FONT[style?.body_font || 'Helvetica'] || 'Arial';
  return { hf, bf };
}

function getDocxSizes(style?: MassBookletStyle) {
  // docx sizes are in half-points
  const bodySize = Math.round((style?.body_size || 10.5) * 2);
  const headingSize = Math.round((style?.heading_size || 14) * 2);
  return { bodySize, headingSize };
}

function getDocxColors(style?: MassBookletStyle) {
  const strip = (c: string) => c.replace('#', '');
  return {
    heading: strip(style?.heading_color || '#1a1a1a'),
    subtitle: strip(style?.subtitle_color || '#8b7355'),
    rubric: strip(style?.rubric_color || '#8b4513'),
  };
}

function rep(text: string, p1: string, p2: string): string {
  return text
    .replace(/\{\{partner1\}\}/g, p1 || '___')
    .replace(/\{\{partner2\}\}/g, p2 || '___')
    .replace(/\{\{name\}\}/g, '___');
}

function sectionTitle(text: string, style?: MassBookletStyle): Paragraph {
  const { hf } = getDocxFonts(style);
  const { headingSize } = getDocxSizes(style);
  const { heading } = getDocxColors(style);
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 240, after: 120 },
    children: [new TextRun({ text, bold: true, font: hf, size: headingSize, color: heading })],
  });
}

function subTitle(text: string, style?: MassBookletStyle): Paragraph {
  const { hf } = getDocxFonts(style);
  const { headingSize } = getDocxSizes(style);
  const { heading } = getDocxColors(style);
  return new Paragraph({
    spacing: { before: 200, after: 80 },
    children: [new TextRun({ text, bold: true, font: hf, size: headingSize - 4, color: heading })],
  });
}

function bodyPara(text: string, style?: MassBookletStyle): Paragraph {
  const { bf } = getDocxFonts(style);
  const { bodySize } = getDocxSizes(style);
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { after: 60 },
    children: [new TextRun({ text, font: bf, size: bodySize })],
  });
}

function rubricPara(text: string, style?: MassBookletStyle): Paragraph {
  const { bf } = getDocxFonts(style);
  const { bodySize } = getDocxSizes(style);
  const { rubric } = getDocxColors(style);
  return new Paragraph({
    spacing: { before: 80, after: 40 },
    children: [new TextRun({ text, italics: true, font: bf, size: bodySize - 3, color: rubric })],
  });
}

function responsePara(text: string, style?: MassBookletStyle): Paragraph {
  const { bf } = getDocxFonts(style);
  const { bodySize } = getDocxSizes(style);
  return new Paragraph({
    spacing: { after: 40 },
    children: [new TextRun({ text, bold: true, font: bf, size: bodySize })],
  });
}

function songBlock(label: string, name: string, style?: MassBookletStyle): Paragraph[] {
  if (!name) return [];
  const { bf } = getDocxFonts(style);
  const { bodySize } = getDocxSizes(style);
  const { subtitle } = getDocxColors(style);
  return [
    new Paragraph({
      spacing: { before: 120, after: 20 },
      children: [new TextRun({ text: label, bold: true, font: bf, size: bodySize - 3, color: subtitle })],
    }),
    new Paragraph({
      spacing: { after: 60 },
      children: [new TextRun({ text: name, italics: true, font: bf, size: bodySize - 1 })],
    }),
  ];
}

function separator(): Paragraph {
  return new Paragraph({
    spacing: { before: 120, after: 120 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: 'D4C5A0', space: 1 } },
    children: [],
  });
}

function spacer(): Paragraph {
  return new Paragraph({ spacing: { before: 120 }, children: [] });
}

// Build reading paragraphs
function readingBlock(label: string, source: string, reference: string, text: string, style?: MassBookletStyle): Paragraph[] {
  const { bf } = getDocxFonts(style);
  const { bodySize } = getDocxSizes(style);
  const paras: Paragraph[] = [subTitle(label, style)];
  if (source) paras.push(rubricPara(source, style));
  if (reference) paras.push(new Paragraph({
    spacing: { after: 60 },
    children: [new TextRun({ text: reference, font: bf, size: bodySize - 3, color: '6B6B6B' })],
  }));
  paras.push(bodyPara(text, style));
  return paras;
}

function psalmBlock(psalm: LiturgiaPsalm, style?: MassBookletStyle): Paragraph[] {
  const { bf } = getDocxFonts(style);
  const { bodySize } = getDocxSizes(style);
  const paras: Paragraph[] = [
    subTitle('Salmo Responsoriale', style),
    new Paragraph({
      spacing: { after: 60 },
      children: [new TextRun({ text: psalm.reference, font: bf, size: bodySize - 3, color: '6B6B6B' })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [new TextRun({ text: psalm.refrain, italics: true, font: bf, size: bodySize })],
    }),
  ];
  for (const v of psalm.verses) {
    paras.push(bodyPara(v, style));
    paras.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [new TextRun({ text: psalm.refrain, italics: true, font: bf, size: bodySize })],
    }));
  }
  return paras;
}

export async function generateBookletDocx(
  content: MassBookletContent,
  partner1: string,
  partner2: string,
): Promise<Blob> {
  const ft = lit.fixed_texts;
  const isEucharist = content.rite_type === 'messa_eucaristia';
  const r = content.readings;
  const st = content.style;
  const { hf, bf } = getDocxFonts(st);
  const { bodySize } = getDocxSizes(st);
  const colors = getDocxColors(st);

  // --- Cover page ---
  const coverChildren: Paragraph[] = [
    new Paragraph({ spacing: { before: 2400 }, children: [] }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: '✝', font: hf, size: 56, color: colors.subtitle })],
    }),
    new Paragraph({ spacing: { before: 400 }, children: [] }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: partner1 || '...', bold: true, font: hf, size: 40, color: colors.heading })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 80, after: 80 },
      children: [new TextRun({ text: '&', italics: true, font: hf, size: 28, color: colors.subtitle })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: partner2 || '...', bold: true, font: hf, size: 40, color: colors.heading })],
    }),
    new Paragraph({ spacing: { before: 300 }, children: [] }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: content.ceremony_date_text, font: bf, size: 22, color: '4A4A4A' })],
    }),
  ];
  if (content.church_name) {
    coverChildren.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 60 },
      children: [new TextRun({ text: content.church_name, font: bf, size: 20, color: '6B6B6B' })],
    }));
  }

  // --- Rite intro ---
  const introChildren: Paragraph[] = [
    sectionTitle('Riti di Introduzione', st),
    separator(),
    ...songBlock('CANTO D\'INGRESSO', content.songs.entrance, st),
    rubricPara('Il celebrante dice:', st),
    responsePara(ft.rite_intro.sign_of_cross, st),
    bodyPara(ft.rite_intro.greeting, st),
    responsePara(ft.rite_intro.response_greeting, st),
    spacer(),
    subTitle('Memoria del Battesimo', st),
    bodyPara(rep(ft.baptism_memory, partner1, partner2), st),
  ];

  // --- Readings ---
  const readingsChildren: Paragraph[] = [
    sectionTitle('Liturgia della Parola', st),
    separator(),
  ];

  if (r.use_custom_first_reading && r.first_reading_custom) {
    readingsChildren.push(...readingBlock('Prima Lettura', '', '', r.first_reading_custom, st));
  } else if (r.first_reading) {
    const rd = lit.readings.first_reading.find(x => x.id === r.first_reading) as LiturgiaReading | undefined;
    if (rd) readingsChildren.push(...readingBlock('Prima Lettura', rd.source, rd.reference, rd.text, st));
  }

  if (r.use_custom_psalm && r.psalm_custom) {
    readingsChildren.push(subTitle('Salmo Responsoriale', st), bodyPara(r.psalm_custom, st));
  } else if (r.psalm) {
    const ps = lit.readings.responsorial_psalm.find(x => x.id === r.psalm) as LiturgiaPsalm | undefined;
    if (ps) readingsChildren.push(...psalmBlock(ps, st));
  }

  if (r.use_custom_second_reading && r.second_reading_custom) {
    readingsChildren.push(...readingBlock('Seconda Lettura', '', '', r.second_reading_custom, st));
  } else if (r.second_reading) {
    const rd = lit.readings.second_reading.find(x => x.id === r.second_reading) as LiturgiaReading | undefined;
    if (rd) readingsChildren.push(...readingBlock('Seconda Lettura', rd.source, rd.reference, rd.text, st));
  }

  if (r.use_custom_gospel && r.gospel_custom) {
    readingsChildren.push(...readingBlock('Vangelo', '', '', r.gospel_custom, st));
  } else if (r.gospel) {
    const rd = lit.readings.gospel.find(x => x.id === r.gospel) as LiturgiaReading | undefined;
    if (rd) readingsChildren.push(...readingBlock('Vangelo', rd.source, rd.reference, rd.text, st));
  }

  // --- Consent ---
  const consentChildren: Paragraph[] = [
    sectionTitle('Rito del Matrimonio', st),
    separator(),
    subTitle('Interrogazioni', st),
    bodyPara(rep(ft.consent_questions.intro, partner1, partner2), st),
    rubricPara('Il celebrante interroga gli sposi:', st),
    bodyPara(rep(ft.consent_questions.question_freedom, partner1, partner2), st),
    responsePara('Sì.', st),
    bodyPara(rep(ft.consent_questions.question_faithfulness, partner1, partner2), st),
    responsePara('Sì.', st),
    bodyPara(rep(ft.consent_questions.question_children, partner1, partner2), st),
    responsePara('Sì.', st),
    spacer(),
    subTitle('Consenso', st),
    rubricPara('Lo sposo dice:', st),
    bodyPara(rep(ft.consent_formula.groom, partner1, partner2), st),
    rubricPara('La sposa dice:', st),
    bodyPara(rep(ft.consent_formula.bride, partner1, partner2), st),
    rubricPara('Il celebrante dice:', st),
    bodyPara(ft.consent_acceptance, st),
    spacer(),
    subTitle('Benedizione e Scambio degli Anelli', st),
    bodyPara(ft.rings_blessing, st),
    rubricPara('Ciascuno degli sposi dice mettendo l\'anello:', st),
    bodyPara(rep(ft.ring_exchange.formula, partner1, partner2), st),
  ];

  // --- Prayers ---
  const prayersChildren: Paragraph[] = [];
  if (content.prayers.intentions.length) {
    prayersChildren.push(
      subTitle('Preghiera dei Fedeli', st),
      rubricPara('Dopo ogni intenzione l\'assemblea risponde:', st),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 80 },
        children: [new TextRun({ text: content.prayers.refrain, italics: true, font: bf, size: bodySize })],
      }),
    );
    for (const intention of content.prayers.intentions) {
      prayersChildren.push(bodyPara(intention, st));
      prayersChildren.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 80 },
        children: [new TextRun({ text: content.prayers.refrain, italics: true, font: bf, size: bodySize })],
      }));
    }
  }

  // --- Eucharist / Our Father ---
  const eucharistChildren: Paragraph[] = [];
  if (isEucharist) {
    eucharistChildren.push(
      sectionTitle('Liturgia Eucaristica', st),
      separator(),
      ...songBlock('CANTO D\'OFFERTORIO', content.songs.offertory, st),
      spacer(),
    );
    if (content.songs.holy) {
      eucharistChildren.push(...songBlock('SANTO', content.songs.holy, st));
    }
    eucharistChildren.push(subTitle('Padre Nostro', st), bodyPara(ft.our_father, st), spacer());
    if (content.songs.peace) {
      eucharistChildren.push(...songBlock('SEGNO DELLA PACE', content.songs.peace, st));
    }
    if (content.songs.fraction) {
      eucharistChildren.push(...songBlock('AGNELLO DI DIO', content.songs.fraction, st));
    }
    eucharistChildren.push(...songBlock('CANTO DI COMUNIONE', content.songs.communion, st));
    if (content.songs.communion_2) {
      eucharistChildren.push(...songBlock('CANTO DI COMUNIONE (2)', content.songs.communion_2, st));
    }
  } else {
    eucharistChildren.push(subTitle('Padre Nostro', st), bodyPara(ft.our_father, st));
  }

  // --- Thanks ---
  const thanksChildren: Paragraph[] = [];
  if (content.thanks.text) {
    thanksChildren.push(
      sectionTitle('Ringraziamenti', st),
      separator(),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: content.thanks.text, italics: true, font: bf, size: bodySize })],
      }),
    );
  }

  // --- Gloria + exit ---
  const finalChildren: Paragraph[] = [];
  if (content.songs.gloria) {
    finalChildren.push(...songBlock('GLORIA', content.songs.gloria, st));
  }
  finalChildren.push(...songBlock('CANTO FINALE', content.songs.exit, st));

  // Build document with sections
  const pageProps = {
    page: {
      size: { width: A5_W, height: A5_H },
      margin: { top: 850, bottom: 850, left: 680, right: 567 },
    },
  };

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: bf, size: bodySize },
        },
      },
    },
    sections: [
      { properties: { ...pageProps }, children: coverChildren },
      { properties: { ...pageProps }, children: introChildren },
      { properties: { ...pageProps }, children: readingsChildren },
      { properties: { ...pageProps }, children: consentChildren },
      {
        properties: { ...pageProps },
        children: [
          ...prayersChildren,
          spacer(),
          ...eucharistChildren,
          spacer(),
          ...thanksChildren,
          spacer(),
          ...finalChildren,
        ],
      },
    ],
  });

  return await Packer.toBlob(doc);
}
