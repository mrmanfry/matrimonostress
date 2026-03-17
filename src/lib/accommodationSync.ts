import { supabase } from "@/integrations/supabase/client";

const SYNC_DESCRIPTION = "Pernotto – Camere";

export async function syncAccommodationExpense(vendorId: string, weddingId: string) {
  // 1. Calculate total from rooms
  const { data: rooms } = await supabase
    .from("accommodation_rooms")
    .select("price_per_night, nights")
    .eq("vendor_id", vendorId);

  const total = (rooms ?? []).reduce(
    (sum, r) => sum + Number(r.price_per_night) * Number(r.nights),
    0
  );

  // 2. Find existing synced expense_item
  const { data: existing } = await supabase
    .from("expense_items")
    .select("id")
    .eq("vendor_id", vendorId)
    .eq("wedding_id", weddingId)
    .eq("description", SYNC_DESCRIPTION)
    .maybeSingle();

  // 3. Upsert / delete
  if (existing) {
    if (total > 0) {
      await supabase
        .from("expense_items")
        .update({ total_amount: total, fixed_amount: total })
        .eq("id", existing.id);
    } else {
      await supabase.from("expense_items").delete().eq("id", existing.id);
    }
  } else if (total > 0) {
    await supabase.from("expense_items").insert({
      wedding_id: weddingId,
      vendor_id: vendorId,
      description: SYNC_DESCRIPTION,
      expense_type: "fixed",
      total_amount: total,
      fixed_amount: total,
      calculation_mode: "planned",
    });
  }
}
