import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return json({ error: "Expected multipart/form-data" }, 400);
    }

    const formData = await req.formData();
    const token = formData.get("token") as string;
    const fingerprint = formData.get("fingerprint") as string;
    const guestName = (formData.get("guest_name") as string) || null;
    const filmType = (formData.get("film_type") as string) || null;
    const file = formData.get("photo") as File | null;

    if (!token || !fingerprint || !file) {
      return json({ error: "Missing required fields: token, fingerprint, photo" }, 400);
    }

    // Reject payload > 2MB
    if (file.size > 2 * 1024 * 1024) {
      return json({ error: "file_too_large", message: "Max 2MB" }, 400);
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Find camera by token
    const { data: camera, error: camErr } = await supabaseAdmin
      .from("disposable_cameras")
      .select("*")
      .eq("token", token)
      .single();

    if (camErr || !camera) {
      return json({ error: "invalid_token" }, 404);
    }

    // 2. Check active
    if (!camera.is_active) {
      return json({ error: "camera_inactive" }, 403);
    }

    // 3. Check ending_date
    if (camera.ending_date && new Date(camera.ending_date) < new Date()) {
      return json({ error: "camera_expired" }, 403);
    }

    // 4. Check hard storage limit
    const { count: totalPhotos } = await supabaseAdmin
      .from("camera_photos")
      .select("id", { count: "exact", head: true })
      .eq("camera_id", camera.id);

    if ((totalPhotos ?? 0) >= camera.hard_storage_limit) {
      return json({ error: "film_full", message: "Hard storage limit reached" }, 200);
    }

    // 5. Check shots per person
    const { data: participant } = await supabaseAdmin
      .from("camera_participants")
      .select("shots_taken")
      .eq("camera_id", camera.id)
      .eq("guest_fingerprint", fingerprint)
      .maybeSingle();

    const currentShots = participant?.shots_taken ?? 0;
    if (currentShots >= camera.shots_per_person) {
      return json({ error: "shots_exhausted", shots_remaining: 0 }, 200);
    }

    // 6. Upload file to storage
    const photoId = crypto.randomUUID();
    const ext = file.type === "image/webp" ? "webp" : "jpg";
    const filePath = `${camera.id}/${photoId}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const { error: uploadErr } = await supabaseAdmin.storage
      .from("camera-photos")
      .upload(filePath, arrayBuffer, {
        contentType: file.type || "image/webp",
        upsert: false,
      });

    if (uploadErr) {
      console.error("Upload error:", uploadErr);
      return json({ error: "upload_failed" }, 500);
    }

    // 7. Insert photo record
    const { error: insertErr } = await supabaseAdmin
      .from("camera_photos")
      .insert({
        camera_id: camera.id,
        file_path: filePath,
        guest_name: guestName,
        guest_fingerprint: fingerprint,
        film_type_applied: filmType,
        is_approved: !camera.require_approval,
      });

    if (insertErr) {
      console.error("Insert error:", insertErr);
      // Cleanup uploaded file
      await supabaseAdmin.storage.from("camera-photos").remove([filePath]);
      return json({ error: "insert_failed" }, 500);
    }

    // 8. Upsert participant and increment shots_taken atomically
    if (participant) {
      await supabaseAdmin
        .from("camera_participants")
        .update({
          shots_taken: currentShots + 1,
          guest_name: guestName || participant.guest_name || null,
        })
        .eq("camera_id", camera.id)
        .eq("guest_fingerprint", fingerprint);
    } else {
      await supabaseAdmin.from("camera_participants").insert({
        camera_id: camera.id,
        guest_name: guestName,
        guest_fingerprint: fingerprint,
        shots_taken: 1,
      });
    }

    const shotsRemaining = camera.shots_per_person - (currentShots + 1);

    return json({
      success: true,
      shots_remaining: shotsRemaining,
      photo_id: photoId,
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    return json({ error: "internal_error" }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
