import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Non autenticato" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify user via anon client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } =
      await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Token non valido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;

    const { mode, wedding_id } = await req.json();

    if (!["leave_wedding", "delete_wedding", "delete_everything"].includes(mode)) {
      return new Response(
        JSON.stringify({ error: "Modalità non valida" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Admin client for privileged operations
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    if (mode === "leave_wedding") {
      if (!wedding_id) {
        return new Response(
          JSON.stringify({ error: "wedding_id richiesto" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Verify there's another co_planner
      const { count } = await adminClient
        .from("user_roles")
        .select("id", { count: "exact", head: true })
        .eq("wedding_id", wedding_id)
        .eq("role", "co_planner")
        .neq("user_id", userId);

      if (!count || count < 1) {
        return new Response(
          JSON.stringify({
            error: "Non puoi lasciare questo matrimonio: sei l'unico proprietario. Usa 'Elimina matrimonio'.",
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Remove user's roles for this wedding
      await adminClient
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("wedding_id", wedding_id);

      // Clean up financial_contributors linked to this user
      await adminClient
        .from("financial_contributors")
        .update({ user_id: null })
        .eq("user_id", userId)
        .eq("wedding_id", wedding_id);

      return new Response(
        JSON.stringify({ success: true, message: "Hai lasciato il matrimonio" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (mode === "delete_wedding") {
      if (!wedding_id) {
        return new Response(
          JSON.stringify({ error: "wedding_id richiesto" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Verify user is the only co_planner
      const { count: otherCoplanners } = await adminClient
        .from("user_roles")
        .select("id", { count: "exact", head: true })
        .eq("wedding_id", wedding_id)
        .eq("role", "co_planner")
        .neq("user_id", userId);

      if (otherCoplanners && otherCoplanners > 0) {
        return new Response(
          JSON.stringify({
            error: "Ci sono altri co-planner. Usa 'Lascia questo matrimonio' oppure chiedi all'altro proprietario di eliminarlo.",
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Verify user actually has co_planner role
      const { count: myRole } = await adminClient
        .from("user_roles")
        .select("id", { count: "exact", head: true })
        .eq("wedding_id", wedding_id)
        .eq("role", "co_planner")
        .eq("user_id", userId);

      if (!myRole || myRole < 1) {
        return new Response(
          JSON.stringify({ error: "Non hai i permessi per eliminare questo matrimonio" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Delete wedding — CASCADE handles all child tables
      const { error: deleteError } = await adminClient
        .from("weddings")
        .delete()
        .eq("id", wedding_id);

      if (deleteError) {
        console.error("Error deleting wedding:", deleteError);
        return new Response(
          JSON.stringify({ error: "Errore nell'eliminazione del matrimonio" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, message: "Matrimonio eliminato" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (mode === "delete_everything") {
      // Get all weddings where user has a role
      const { data: userRoles } = await adminClient
        .from("user_roles")
        .select("wedding_id, role")
        .eq("user_id", userId);

      if (userRoles && userRoles.length > 0) {
        // Group by wedding
        const weddingIds = [...new Set(userRoles.map((r) => r.wedding_id))];

        for (const wId of weddingIds) {
          const roles = userRoles.filter((r) => r.wedding_id === wId);
          const isCoPlanner = roles.some((r) => r.role === "co_planner");

          if (isCoPlanner) {
            // Check if there's another co_planner
            const { count: otherCp } = await adminClient
              .from("user_roles")
              .select("id", { count: "exact", head: true })
              .eq("wedding_id", wId)
              .eq("role", "co_planner")
              .neq("user_id", userId);

            if (otherCp && otherCp > 0) {
              // Leave wedding (another co_planner exists)
              await adminClient
                .from("user_roles")
                .delete()
                .eq("user_id", userId)
                .eq("wedding_id", wId);

              await adminClient
                .from("financial_contributors")
                .update({ user_id: null })
                .eq("user_id", userId)
                .eq("wedding_id", wId);
            } else {
              // Delete wedding (sole owner)
              await adminClient.from("weddings").delete().eq("id", wId);
            }
          } else {
            // Not co_planner, just remove role
            await adminClient
              .from("user_roles")
              .delete()
              .eq("user_id", userId)
              .eq("wedding_id", wId);
          }
        }
      }

      // Delete profile
      await adminClient.from("profiles").delete().eq("id", userId);

      // Delete auth user
      const { error: deleteUserError } =
        await adminClient.auth.admin.deleteUser(userId);

      if (deleteUserError) {
        console.error("Error deleting auth user:", deleteUserError);
        return new Response(
          JSON.stringify({ error: "Errore nell'eliminazione dell'account" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, message: "Account eliminato completamente" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Modalità non gestita" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("delete-account error:", error);
    return new Response(
      JSON.stringify({ error: "Errore interno del server" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
