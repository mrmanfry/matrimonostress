// Utility per import/export CSV invitati
import { z } from "zod";

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

/**
 * Template CSV per il download
 */
export function generateCSVTemplate(): string {
  const headers = [
    "first_name",
    "last_name",
    "rsvp_status",
    "adults_count",
    "children_count",
    "menu_choice",
    "dietary_restrictions",
    "notes",
    "group_name",
  ];

  const exampleRow = [
    "Mario",
    "Rossi",
    "pending",
    "1",
    "0",
    "Carne",
    "Nessuna allergia",
    "Amico d'infanzia",
    "Amici",
  ];

  return [headers.join(","), exampleRow.join(",")].join("\n");
}

/**
 * Parse CSV content
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
 * Validate CSV rows
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
    "first_name",
    "last_name",
    "rsvp_status",
    "adults_count",
    "children_count",
    "menu_choice",
    "dietary_restrictions",
    "notes",
    "group_name",
  ];

  const rows = guests.map((guest) => [
    guest.first_name || "",
    guest.last_name || "",
    guest.rsvp_status || "pending",
    guest.adults_count || "1",
    guest.children_count || "0",
    guest.menu_choice || "",
    guest.dietary_restrictions || "",
    guest.notes || "",
    guest.group_name || "",
  ]);

  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

/**
 * Download CSV file
 */
export function downloadCSV(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
