// Utility per import/export CSV invitati - Smart CSV Import
import { z } from "zod";

// ============= INTERFACES =============

export interface GuestCSVRow {
  first_name: string;
  last_name: string;
  rsvp_status?: string;
  adults_count?: number;
  children_count?: number;
  menu_choice?: string;
  dietary_restrictions?: string;
  notes?: string;
  group_name?: string;
}

export interface SmartCSVGuestRow {
  first_name: string;
  last_name: string;
  alias?: string;
  phone?: string;
  is_child?: boolean;
  party_name?: string;
  group_name?: string;
  menu_choice?: string;
  dietary_restrictions?: string;
  notes?: string;
}

export interface ColumnMapping {
  csvColumn: string;
  dbField: string | null;
}

export interface GroupedImportData {
  parties: Record<string, SmartCSVGuestRow[]>;
  singles: SmartCSVGuestRow[];
}

export interface ImportValidationResult {
  valid: SmartCSVGuestRow[];
  errors: Array<{ row: number; message: string }>;
  warnings: Array<{ row: number; message: string }>;
}

// ============= COLUMN ALIASES FOR AUTO-MATCHING =============

export const COLUMN_ALIASES: Record<string, string[]> = {
  first_name: ['nome', 'first name', 'firstname', 'name', 'first_name', 'nome invitato'],
  last_name: ['cognome', 'last name', 'lastname', 'surname', 'last_name', 'family name'],
  alias: ['alias', 'soprannome', 'nickname', 'nick', 'diminutivo'],
  phone: ['telefono', 'cellulare', 'cell', 'phone', 'mobile', 'tel', 'numero', 'numero di telefono', 'numero telefono'],
  is_child: ['bambino', 'child', 'minore', 'kid', 'bimbo', 'minorenne', 'è bambino'],
  party_name: ['nucleo', 'famiglia', 'family', 'party', 'gruppo familiare', 'party_name', 'household', 'nucleo familiare'],
  group_name: ['gruppo', 'categoria', 'group', 'category', 'gruppo invitato', 'tipo'],
  menu_choice: ['menu', 'menù', 'menu_choice', 'scelta menu', 'scelta menù', 'preferenza menu'],
  dietary_restrictions: ['dieta', 'allergie', 'dietary', 'restrictions', 'restrizioni', 'intolleranze', 'dietary_restrictions'],
  notes: ['note', 'notes', 'commenti', 'comments', 'osservazioni'],
};

// ============= VALIDATION SCHEMA =============

const csvGuestSchema = z.object({
  first_name: z.string().trim().min(1, "Nome obbligatorio").max(100),
  last_name: z.string().trim().min(1, "Cognome obbligatorio").max(100),
  rsvp_status: z.enum(["pending", "confirmed", "declined"]).optional(),
  adults_count: z.number().min(0).max(20).optional(),
  children_count: z.number().min(0).max(20).optional(),
  menu_choice: z.string().trim().max(200).optional(),
  dietary_restrictions: z.string().trim().max(500).optional(),
  notes: z.string().trim().max(1000).optional(),
  group_name: z.string().trim().max(100).optional(),
});

const smartCsvGuestSchema = z.object({
  first_name: z.string().trim().min(1, "Nome obbligatorio").max(100),
  last_name: z.string().trim().max(100).optional().default(""),
  alias: z.string().trim().max(50).optional(),
  phone: z.string().trim().max(20).optional(),
  is_child: z.boolean().optional().default(false),
  party_name: z.string().trim().max(100).optional(),
  group_name: z.string().trim().max(100).optional(),
  menu_choice: z.string().trim().max(200).optional(),
  dietary_restrictions: z.string().trim().max(500).optional(),
  notes: z.string().trim().max(1000).optional(),
});

// ============= PHONE NORMALIZATION =============

/**
 * Normalizza un numero di telefono italiano
 * - Rimuove spazi, trattini, parentesi
 * - Aggiunge prefisso +39 se manca
 */
export function normalizePhone(phone: string | undefined | null): string | undefined {
  if (!phone) return undefined;
  
  // Rimuovi tutto ciò che non è numero o +
  let cleaned = phone.replace(/[^\d+]/g, '');
  
  if (!cleaned) return undefined;
  
  // Se inizia con 3 e ha 10 cifre, è un cellulare italiano senza prefisso
  if (cleaned.startsWith('3') && cleaned.length === 10) {
    return '+39' + cleaned;
  }
  
  // Se inizia con 0039, sostituisci con +39
  if (cleaned.startsWith('0039')) {
    return '+39' + cleaned.slice(4);
  }
  
  // Se inizia con 39 e ha 12 cifre (39 + 10), aggiungi +
  if (cleaned.startsWith('39') && cleaned.length === 12) {
    return '+' + cleaned;
  }
  
  // Se già inizia con +, restituisci così
  if (cleaned.startsWith('+')) {
    return cleaned;
  }
  
  // Altrimenti aggiungi +39 se sembra un numero italiano
  if (cleaned.length >= 9 && cleaned.length <= 10) {
    return '+39' + cleaned;
  }
  
  return cleaned;
}

// ============= AUTO-MATCH COLUMNS =============

/**
 * Tenta di mappare automaticamente le intestazioni CSV ai campi del DB
 */
export function autoMatchColumns(headers: string[]): Record<string, string | null> {
  const mapping: Record<string, string | null> = {};
  
  headers.forEach(header => {
    const normalizedHeader = header.toLowerCase().trim();
    let matched = false;
    
    for (const [dbField, aliases] of Object.entries(COLUMN_ALIASES)) {
      if (aliases.some(alias => alias === normalizedHeader || normalizedHeader.includes(alias))) {
        mapping[header] = dbField;
        matched = true;
        break;
      }
    }
    
    if (!matched) {
      mapping[header] = null; // Non mappato
    }
  });
  
  return mapping;
}

/**
 * Ottieni i campi DB disponibili per il mapping
 */
export function getAvailableDbFields(): Array<{ value: string; label: string }> {
  return [
    { value: 'first_name', label: 'Nome (Obbligatorio)' },
    { value: 'last_name', label: 'Cognome' },
    { value: 'alias', label: 'Soprannome / Alias' },
    { value: 'phone', label: 'Telefono' },
    { value: 'is_child', label: 'È Bambino' },
    { value: 'party_name', label: 'Nucleo Familiare' },
    { value: 'group_name', label: 'Gruppo / Categoria' },
    { value: 'menu_choice', label: 'Scelta Menu' },
    { value: 'dietary_restrictions', label: 'Restrizioni Alimentari' },
    { value: 'notes', label: 'Note' },
  ];
}

// ============= PARSE BOOLEAN VALUES =============

/**
 * Interpreta valori booleani da stringhe (per is_child)
 */
export function parseBoolean(value: string | undefined | null): boolean {
  if (!value) return false;
  const normalized = value.toLowerCase().trim();
  return ['sì', 'si', 'yes', 'true', '1', 'x', 'vero'].includes(normalized);
}

// ============= CAPITALIZE =============

/**
 * Capitalizza la prima lettera di ogni parola
 */
export function capitalize(str: string): string {
  if (!str) return '';
  return str
    .trim()
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// ============= NORMALIZE PARTY NAME =============

/**
 * Normalizza il nome del nucleo per confronti
 */
export function normalizePartyName(name: string | undefined | null): string {
  if (!name) return '';
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

// ============= GROUP GUESTS BY PARTY =============

/**
 * Raggruppa gli ospiti per nucleo familiare
 */
export function groupGuestsByParty(rows: SmartCSVGuestRow[]): GroupedImportData {
  const parties: Record<string, SmartCSVGuestRow[]> = {};
  const singles: SmartCSVGuestRow[] = [];
  
  rows.forEach(row => {
    if (row.party_name) {
      const normalizedName = normalizePartyName(row.party_name);
      const displayName = row.party_name.trim();
      
      // Usa la versione normalizzata come chiave, ma mantieni il nome originale
      if (!parties[normalizedName]) {
        parties[normalizedName] = [];
      }
      parties[normalizedName].push({
        ...row,
        party_name: displayName, // Mantieni il nome formattato
      });
    } else {
      singles.push(row);
    }
  });
  
  return { parties, singles };
}

// ============= PARSE CSV CONTENT =============

/**
 * Parse del contenuto CSV in righe raw
 */
export function parseCSVContent(content: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = content.trim().split('\n');
  if (lines.length < 1) {
    throw new Error("CSV vuoto");
  }
  
  // Rileva il separatore (virgola o punto e virgola)
  const firstLine = lines[0];
  const separator = firstLine.includes(';') ? ';' : ',';
  
  const headers = parseCSVLine(firstLine, separator);
  const rows: Record<string, string>[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const values = parseCSVLine(line, separator);
    const row: Record<string, string> = {};
    
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    
    rows.push(row);
  }
  
  return { headers, rows };
}

/**
 * Parse di una singola riga CSV gestendo le virgolette
 */
function parseCSVLine(line: string, separator: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // Skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === separator && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

// ============= TRANSFORM ROWS WITH MAPPING =============

/**
 * Trasforma le righe raw in SmartCSVGuestRow usando il mapping
 */
export function transformRowsWithMapping(
  rows: Record<string, string>[],
  mapping: Record<string, string | null>
): SmartCSVGuestRow[] {
  return rows.map(row => {
    const guest: Record<string, any> = {
      first_name: '', // default required field
    };
    
    for (const [csvColumn, dbField] of Object.entries(mapping)) {
      if (!dbField || !row[csvColumn]) continue;
      
      const value = row[csvColumn].trim();
      if (!value) continue;
      
      switch (dbField) {
        case 'first_name':
          (guest as any).first_name = capitalize(value);
          break;
        case 'last_name':
          (guest as any).last_name = capitalize(value);
          break;
        case 'alias':
          (guest as any).alias = value;
          break;
        case 'phone':
          guest.phone = normalizePhone(value);
          break;
        case 'is_child':
          guest.is_child = parseBoolean(value);
          break;
        case 'party_name':
          guest.party_name = value.trim();
          break;
        case 'group_name':
          guest.group_name = value.trim();
          break;
        case 'menu_choice':
          guest.menu_choice = value;
          break;
        case 'dietary_restrictions':
          guest.dietary_restrictions = value;
          break;
        case 'notes':
          guest.notes = value;
          break;
      }
    }
    
    return guest as SmartCSVGuestRow;
  });
}

// ============= VALIDATE TRANSFORMED ROWS =============

/**
 * Valida le righe trasformate
 */
export function validateSmartCSVRows(rows: SmartCSVGuestRow[]): ImportValidationResult {
  const valid: SmartCSVGuestRow[] = [];
  const errors: Array<{ row: number; message: string }> = [];
  const warnings: Array<{ row: number; message: string }> = [];
  
  rows.forEach((row, index) => {
    const rowNum = index + 2; // +2 perché la riga 1 è l'header e gli indici partono da 0
    
    try {
      // Verifica nome obbligatorio
      if (!row.first_name || row.first_name.trim() === '') {
        errors.push({ row: rowNum, message: 'Nome mancante' });
        return;
      }
      
      // Valida con Zod
      const validated = smartCsvGuestSchema.parse({
        ...row,
        last_name: row.last_name || '',
      });
      
      // Cast sicuro perché abbiamo già verificato che first_name esiste
      valid.push(validated as SmartCSVGuestRow);
      
      // Warning se manca il cognome
      if (!validated.last_name) {
        warnings.push({ row: rowNum, message: 'Cognome mancante' });
      }
      
      // Warning se il telefono sembra invalido
      if (row.phone && !validated.phone) {
        warnings.push({ row: rowNum, message: 'Telefono non valido, verrà ignorato' });
      }
      
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        errors.push({ row: rowNum, message: error.errors[0].message });
      } else {
        errors.push({ row: rowNum, message: 'Errore di validazione' });
      }
    }
  });
  
  return { valid, errors, warnings };
}

// ============= LEGACY FUNCTIONS (backward compatibility) =============

/**
 * Template CSV per il download
 */
export function generateCSVTemplate(): string {
  const headers = [
    "Nome",
    "Cognome",
    "Soprannome",
    "Telefono",
    "Nucleo",
    "Gruppo",
    "Bambino",
    "Menu",
    "Restrizioni",
    "Note",
  ];

  const exampleRows = [
    ["Mario", "Rossi", "Roby", "3331234567", "Famiglia Rossi", "Amici Sposo", "no", "Carne", "", "Amico d'infanzia"],
    ["Anna", "Verdi", "", "3339876543", "Famiglia Rossi", "Amici Sposo", "no", "Pesce", "", ""],
    ["Luca", "Rossi", "Luchino", "", "Famiglia Rossi", "Amici Sposo", "sì", "Bambini", "", ""],
    ["Marco", "Esposito", "", "3401234567", "", "Colleghi", "no", "Vegetariano", "Intollerante lattosio", ""],
  ];

  return [
    headers.join(","),
    ...exampleRows.map(r => r.map(v => `"${v}"`).join(","))
  ].join("\n");
}

/**
 * Parse CSV content (legacy)
 */
export function parseCSV(content: string): GuestCSVRow[] {
  const lines = content.trim().split("\n");
  if (lines.length < 2) throw new Error("CSV vuoto o malformato");

  const headers = lines[0].split(",").map((h) => h.trim());
  const rows: GuestCSVRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim());
    const row: any = {};

    headers.forEach((header, index) => {
      const value = values[index];
      if (!value) return;

      switch (header) {
        case "adults_count":
        case "children_count":
          row[header] = parseInt(value) || 0;
          break;
        case "rsvp_status":
          if (["pending", "confirmed", "declined"].includes(value)) {
            row[header] = value;
          }
          break;
        default:
          row[header] = value;
      }
    });

    if (row.first_name && row.last_name) {
      rows.push(row);
    }
  }

  return rows;
}

/**
 * Validate CSV rows (legacy)
 */
export function validateCSVRows(
  rows: GuestCSVRow[]
): { valid: GuestCSVRow[]; errors: string[] } {
  const valid: GuestCSVRow[] = [];
  const errors: string[] = [];

  rows.forEach((row, index) => {
    try {
      const validated = csvGuestSchema.parse(row) as GuestCSVRow;
      valid.push(validated);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        errors.push(`Riga ${index + 2}: ${error.errors[0].message}`);
      }
    }
  });

  return { valid, errors };
}

/**
 * Export guests to CSV
 */
export function exportGuestsToCSV(guests: any[]): string {
  const headers = [
    "Nome",
    "Cognome",
    "Soprannome",
    "Telefono",
    "Stato RSVP",
    "Menu",
    "Restrizioni",
    "Note",
  ];

  const rows = guests.map((guest) => [
    guest.first_name || "",
    guest.last_name || "",
    guest.alias || "",
    guest.phone || "",
    guest.rsvp_status || "pending",
    guest.menu_choice || "",
    guest.dietary_restrictions || "",
    guest.notes || "",
  ].map(v => `"${v}"`));

  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

/**
 * Download CSV file
 */
export function downloadCSV(content: string, filename: string) {
  const blob = new Blob(["\ufeff" + content], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
