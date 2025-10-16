import { z } from "zod";

// Schema per Vendor
export const vendorSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Il nome del fornitore è obbligatorio")
    .max(200, "Il nome deve essere inferiore a 200 caratteri"),
  category_id: z.string().min(1, "La categoria è obbligatoria"),
  contact_name: z
    .string()
    .trim()
    .max(200, "Il nome del contatto deve essere inferiore a 200 caratteri")
    .optional()
    .or(z.literal("")),
  email: z
    .string()
    .trim()
    .email("Email non valida")
    .max(255, "L'email deve essere inferiore a 255 caratteri")
    .optional()
    .or(z.literal("")),
  phone: z
    .string()
    .trim()
    .regex(/^[+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/, {
      message: "Numero di telefono non valido",
    })
    .optional()
    .or(z.literal("")),
  status: z.enum(["evaluating", "booked", "confirmed", "rejected"]),
  notes: z
    .string()
    .trim()
    .max(1000, "Le note devono essere inferiori a 1000 caratteri")
    .optional()
    .or(z.literal("")),
});

// Schema per Expense
export const expenseSchema = z.object({
  description: z
    .string()
    .trim()
    .min(1, "La descrizione è obbligatoria")
    .max(200, "La descrizione deve essere inferiore a 200 caratteri"),
  category_id: z.string().min(1, "La categoria è obbligatoria"),
  estimated_amount: z
    .number()
    .min(0.01, "L'importo stimato deve essere maggiore di 0"),
  final_amount: z
    .number()
    .min(0.01, "L'importo finale deve essere maggiore di 0")
    .nullable()
    .optional(),
  vendor_id: z.string().nullable().optional(),
});

// Schema per Guest
export const guestSchema = z.object({
  first_name: z
    .string()
    .trim()
    .min(1, "Il nome è obbligatorio")
    .max(100, "Il nome deve essere inferiore a 100 caratteri"),
  last_name: z
    .string()
    .trim()
    .min(1, "Il cognome è obbligatorio")
    .max(100, "Il cognome deve essere inferiore a 100 caratteri"),
  rsvp_status: z.enum(["pending", "confirmed", "declined"]),
  adults_count: z
    .number()
    .int("Deve essere un numero intero")
    .min(0, "Il numero di adulti non può essere negativo")
    .max(20, "Il numero di adulti non può superare 20"),
  children_count: z
    .number()
    .int("Deve essere un numero intero")
    .min(0, "Il numero di bambini non può essere negativo")
    .max(20, "Il numero di bambini non può superare 20"),
  menu_choice: z
    .string()
    .trim()
    .max(200, "La scelta del menù deve essere inferiore a 200 caratteri")
    .optional()
    .or(z.literal("")),
  dietary_restrictions: z
    .string()
    .trim()
    .max(500, "Le restrizioni alimentari devono essere inferiori a 500 caratteri")
    .optional()
    .or(z.literal("")),
  notes: z
    .string()
    .trim()
    .max(1000, "Le note devono essere inferiori a 1000 caratteri")
    .optional()
    .or(z.literal("")),
  group_id: z.string().nullable().optional(),
});

// Schema per Payment
export const paymentSchema = z.object({
  description: z
    .string()
    .trim()
    .min(1, "La descrizione è obbligatoria")
    .max(200, "La descrizione deve essere inferiore a 200 caratteri"),
  amount: z
    .number()
    .min(0.01, "L'importo deve essere maggiore di 0"),
  due_date: z.string().min(1, "La data di scadenza è obbligatoria"),
  status: z.enum(["pending", "paid"]),
  paid_by: z
    .string()
    .trim()
    .max(100, "Il campo 'Pagato da' deve essere inferiore a 100 caratteri")
    .optional()
    .or(z.literal("")),
  paid_at: z.string().nullable().optional(),
  expense_id: z.string(),
});

export type VendorFormData = z.infer<typeof vendorSchema>;
export type ExpenseFormData = z.infer<typeof expenseSchema>;
export type GuestFormData = z.infer<typeof guestSchema>;
export type PaymentFormData = z.infer<typeof paymentSchema>;
