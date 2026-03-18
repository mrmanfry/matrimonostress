import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Verify cron secret
  const cronSecret = Deno.env.get("CRON_SECRET");
  const authHeader = req.headers.get("Authorization");
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    // Also allow anon key for pg_cron
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (authHeader !== `Bearer ${anonKey}`) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  try {
    console.log("[CLEANUP-PHOTOS] Starting cleanup...");

    // Find cameras where photos are NOT unlocked and created_at > 30 days ago
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data: cameras, error: camError } = await supabaseAdmin
      .from("disposable_cameras")
      .select("id, wedding_id")
      .eq("photos_unlocked", false);

    if (camError) throw camError;
    if (!cameras || cameras.length === 0) {
      console.log("[CLEANUP-PHOTOS] No non-unlocked cameras found");
      return new Response(JSON.stringify({ deleted: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let totalDeleted = 0;

    for (const camera of cameras) {
      // Find old photos beyond free limit
      const { data: photos, error: photosErr } = await supabaseAdmin
        .from("camera_photos")
        .select("id, file_path, created_at")
        .eq("camera_id", camera.id)
        .lt("created_at", thirtyDaysAgo)
        .order("created_at", { ascending: true });

      if (photosErr || !photos || photos.length === 0) continue;

      // Get free limit for this camera
      const { data: cam } = await supabaseAdmin
        .from("disposable_cameras")
        .select("free_reveal_limit")
        .eq("id", camera.id)
        .single();

      const freeLimit = cam?.free_reveal_limit || 100;

      // Get total photo count
      const { count } = await supabaseAdmin
        .from("camera_photos")
        .select("id", { count: "exact", head: true })
        .eq("camera_id", camera.id);

      // Only delete photos beyond the free limit
      if ((count || 0) <= freeLimit) continue;

      // Delete excess photos older than 30 days (keep up to freeLimit)
      const excessCount = (count || 0) - freeLimit;
      const photosToDelete = photos.slice(0, Math.min(photos.length, excessCount));

      if (photosToDelete.length === 0) continue;

      // Delete from storage
      const filePaths = photosToDelete.map((p) => p.file_path);
      await supabaseAdmin.storage.from("camera-photos").remove(filePaths);

      // Delete from DB
      const ids = photosToDelete.map((p) => p.id);
      await supabaseAdmin
        .from("camera_photos")
        .delete()
        .in("id", ids);

      totalDeleted += photosToDelete.length;
      console.log(`[CLEANUP-PHOTOS] Deleted ${photosToDelete.length} photos from camera ${camera.id}`);
    }

    console.log(`[CLEANUP-PHOTOS] Total deleted: ${totalDeleted}`);
    return new Response(JSON.stringify({ deleted: totalDeleted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[CLEANUP-PHOTOS] Error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
