import { z } from 'zod';

// ─── Booklet content schema (what's stored in the JSONB `content` column) ───

export const massBookletRolesSchema = z.object({
  priest: z.string().default(''),
  witnesses_groom: z.array(z.string()).default([]),
  witnesses_bride: z.array(z.string()).default([]),
  readers: z.array(z.string()).default([]),
  musicians: z.string().default(''),
});

export const massBookletReadingsSchema = z.object({
  first_reading: z.string().nullable().default(null),   // id from liturgia.json
  psalm: z.string().nullable().default(null),
  second_reading: z.string().nullable().default(null),
  gospel: z.string().nullable().default(null),
  // Toggle for custom text override
  first_reading_custom: z.string().nullable().default(null),
  psalm_custom: z.string().nullable().default(null),
  second_reading_custom: z.string().nullable().default(null),
  gospel_custom: z.string().nullable().default(null),
  use_custom_first_reading: z.boolean().default(false),
  use_custom_psalm: z.boolean().default(false),
  use_custom_second_reading: z.boolean().default(false),
  use_custom_gospel: z.boolean().default(false),
});

export const massBookletSongsSchema = z.object({
  entrance: z.string().default(''),
  offertory: z.string().default(''),
  communion: z.string().default(''),
  communion_2: z.string().default(''),
  exit: z.string().default(''),
  gloria: z.string().default(''),
  holy: z.string().default(''),        // Santo
  peace: z.string().default(''),       // Segno di pace / Agnello di Dio
  fraction: z.string().default(''),    // Frazione del pane
});

export const massBookletPrayersSchema = z.object({
  intentions: z.array(
    z.string().max(300, 'Massimo 300 caratteri per intenzione')
  ).max(6, 'Massimo 6 intenzioni').default([]),
  refrain: z.string().default('Ascoltaci, o Signore.'),
});

export const massBookletThanksSchema = z.object({
  text: z.string().max(2000, 'Massimo 2000 caratteri').default(''),
});

export const massBookletStyleSchema = z.object({
  heading_font: z.enum(['Times-Roman', 'Times-Bold']).default('Times-Bold'),
  body_font: z.enum(['Helvetica', 'Courier']).default('Helvetica'),
  heading_color: z.string().default('#1a1a1a'),
  subtitle_color: z.string().default('#8b7355'),
  rubric_color: z.string().default('#8b4513'),
  body_size: z.number().min(9).max(13).default(10.5),
  heading_size: z.number().min(12).max(20).default(14),
  cover_image_url: z.string().nullable().default(null),
  cover_image_height: z.number().min(50).max(500).default(200),
  cover_layout: z.enum(['text_only', 'image_top', 'image_bottom', 'image_background']).default('text_only'),
});

export const massBookletContentSchema = z.object({
  // Step 1 - Setup
  church_name: z.string().default(''),
  priest_name: z.string().default(''),
  ceremony_date_text: z.string().default(''),
  roles: massBookletRolesSchema.default({}),

  // Step 2 - Rite type
  rite_type: z.enum(['messa_eucaristia', 'liturgia_parola']).default('messa_eucaristia'),

  // Step 3 - Readings
  readings: massBookletReadingsSchema.default({}),

  // Step 4 - Songs & Prayers
  songs: massBookletSongsSchema.default({}),
  prayers: massBookletPrayersSchema.default({}),
  thanks: massBookletThanksSchema.default({}),

  // Step 5 - Style
  style: massBookletStyleSchema.default({}),
});

// ─── Full booklet record schema (what's in the DB row) ───

export const massBookletSchema = z.object({
  id: z.string().uuid(),
  wedding_id: z.string().uuid(),
  status: z.enum(['draft', 'completed']).default('draft'),
  template_style: z.enum(['minimal', 'classic', 'modern']).default('minimal'),
  schema_version: z.number().int().default(1),
  content: massBookletContentSchema.default({}),
  current_step: z.number().int().min(1).max(5).default(1),
  created_at: z.string(),
  updated_at: z.string(),
});

// ─── Types ───

export type MassBookletRoles = z.infer<typeof massBookletRolesSchema>;
export type MassBookletReadings = z.infer<typeof massBookletReadingsSchema>;
export type MassBookletSongs = z.infer<typeof massBookletSongsSchema>;
export type MassBookletPrayers = z.infer<typeof massBookletPrayersSchema>;
export type MassBookletThanks = z.infer<typeof massBookletThanksSchema>;
export type MassBookletStyle = z.infer<typeof massBookletStyleSchema>;
export type MassBookletContent = z.infer<typeof massBookletContentSchema>;
export type MassBooklet = z.infer<typeof massBookletSchema>;

// ─── Liturgia.json types ───

export interface LiturgiaReading {
  id: string;
  reference: string;
  title: string;
  source: string;
  text: string;
}

export interface LiturgiaPsalm {
  id: string;
  reference: string;
  title: string;
  refrain: string;
  verses: string[];
}

export interface LiturgiaData {
  schema_version: number;
  rite_types: { id: string; label: string }[];
  readings: {
    first_reading: LiturgiaReading[];
    responsorial_psalm: LiturgiaPsalm[];
    second_reading: LiturgiaReading[];
    gospel: LiturgiaReading[];
  };
  fixed_texts: {
    rite_intro: {
      sign_of_cross: string;
      greeting: string;
      response_greeting: string;
    };
    baptism_memory: string;
    consent_questions: {
      intro: string;
      question_freedom: string;
      question_faithfulness: string;
      question_children: string;
    };
    consent_formula: {
      groom: string;
      bride: string;
    };
    consent_acceptance: string;
    rings_blessing: string;
    ring_exchange: {
      formula: string;
    };
    prayers_refrain: string;
    our_father: string;
  };
}

// ─── Default content factory ───

export function createDefaultBookletContent(): MassBookletContent {
  return massBookletContentSchema.parse({});
}

// ─── Sanitization ───

export function sanitizeBookletText(text: string): string {
  // Strip HTML tags
  let clean = text.replace(/<[^>]*>/g, '');
  // Remove emoji
  clean = clean.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '');
  // Collapse multiple newlines
  clean = clean.replace(/\n{3,}/g, '\n\n');
  // Remove zero-width characters
  clean = clean.replace(/\u200B/g, '').replace(/\u200C/g, '').replace(/\u200D/g, '').replace(/\uFEFF/g, '');
  return clean.trim();
}

// ─── Validation completeness check for Step 5 ───

export interface BookletValidation {
  isComplete: boolean;
  missing: { step: number; field: string; label: string }[];
}

export function validateBookletCompleteness(content: MassBookletContent): BookletValidation {
  const missing: { step: number; field: string; label: string }[] = [];

  // Step 1 required
  if (!content.church_name) missing.push({ step: 1, field: 'church_name', label: 'Nome della Chiesa' });
  if (!content.priest_name) missing.push({ step: 1, field: 'priest_name', label: 'Nome del Celebrante' });

  // Step 3 required readings
  const r = content.readings;
  if (!r.first_reading && !r.use_custom_first_reading) {
    missing.push({ step: 3, field: 'first_reading', label: 'Prima Lettura' });
  }
  if (r.use_custom_first_reading && !r.first_reading_custom?.trim()) {
    missing.push({ step: 3, field: 'first_reading_custom', label: 'Testo personalizzato Prima Lettura' });
  }
  if (!r.psalm && !r.use_custom_psalm) {
    missing.push({ step: 3, field: 'psalm', label: 'Salmo Responsoriale' });
  }
  if (!r.gospel && !r.use_custom_gospel) {
    missing.push({ step: 3, field: 'gospel', label: 'Vangelo' });
  }

  return {
    isComplete: missing.length === 0,
    missing,
  };
}
