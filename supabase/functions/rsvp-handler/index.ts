import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RSVPConfig {
  hero_image_url: string | null;
  welcome_title: string;
  welcome_text: string;
  deadline_date: string | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    if (req.method === "GET") {
      const url = new URL(req.url);
      let token = url.searchParams.get("token");
      
      // If no token in query params, try to get it from body
      if (!token) {
        try {
          const body = await req.json();
          token = body.token;
        } catch {
          // Body is empty or not JSON
        }
      }
      
      if (!token || token.length < 20) {
        console.log("Invalid token format received");
        return new Response(JSON.stringify({ error: "Invalid token" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: guestData, error: guestError } = await supabase
        .from("guests")
        .select(`
          id, first_name, last_name, rsvp_status, menu_choice, dietary_restrictions,
          party_id, allow_plus_one, plus_one_name, plus_one_menu,
          invite_parties (
            id, party_name, rsvp_status, wedding_id, last_updated_by_guest_id, last_updated_at
          )
        `)
        .eq("unique_rsvp_token", token)
        .single();

      if (guestError || !guestData || !guestData.invite_parties) {
        console.log("Token not found:", token.substring(0, 8) + "...");
        return new Response(JSON.stringify({ error: "Token not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const party = guestData.invite_parties as any;

      const { data: wedding } = await supabase
        .from("weddings")
        .select("partner1_name, partner2_name, wedding_date, rsvp_config")
        .eq("id", party.wedding_id)
        .single();

      const { data: partyMembers } = await supabase
        .from("guests")
        .select("id, first_name, last_name, rsvp_status, menu_choice, dietary_restrictions, is_child, allow_plus_one, plus_one_name, plus_one_menu")
        .eq("party_id", guestData.party_id);

      // Get last editor name if someone else responded
      let lastEditorName: string | null = null;
      if (party.last_updated_by_guest_id && party.last_updated_by_guest_id !== guestData.id) {
        const { data: editor } = await supabase
          .from("guests")
          .select("first_name")
          .eq("id", party.last_updated_by_guest_id)
          .single();
        lastEditorName = editor?.first_name || null;
      }

      // Parse rsvp_config
      const rsvpConfig: RSVPConfig = wedding?.rsvp_config || {
        hero_image_url: null,
        welcome_title: "Benvenuti al nostro Matrimonio",
        welcome_text: "Non vediamo l'ora di festeggiare con voi!",
        deadline_date: null,
      };

      // Check if deadline has passed
      const isReadOnly = rsvpConfig.deadline_date 
        ? new Date(rsvpConfig.deadline_date) < new Date() 
        : false;

      console.log(`RSVP data fetched for guest ${guestData.id}, party ${guestData.party_id}`);

      return new Response(JSON.stringify({
        guest: {
          id: guestData.id,
          firstName: guestData.first_name,
          lastName: guestData.last_name,
        },
        party: {
          id: party.id,
          name: party.party_name,
          status: party.rsvp_status,
          members: partyMembers,
          lastEditorName,
          lastUpdatedAt: party.last_updated_at,
        },
        wedding: {
          couple: wedding ? `${wedding.partner1_name} & ${wedding.partner2_name}` : "",
          date: wedding?.wedding_date || "",
        },
        config: rsvpConfig,
        isReadOnly,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "POST") {
      const { token, partyStatus, members } = await req.json();

      if (!token || token.length < 20) {
        console.log("Invalid token in POST request");
        return new Response(JSON.stringify({ error: "Invalid token" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: validGuest, error: validateError } = await supabase
        .from("guests")
        .select("id, party_id, invite_parties(wedding_id)")
        .eq("unique_rsvp_token", token)
        .single();

      if (validateError || !validGuest) {
        console.log("Invalid token validation failed");
        return new Response(JSON.stringify({ error: "Invalid token" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check deadline
      const party = validGuest.invite_parties as any;
      if (party?.wedding_id) {
        const { data: wedding } = await supabase
          .from("weddings")
          .select("rsvp_config")
          .eq("id", party.wedding_id)
          .single();

        const rsvpConfig = wedding?.rsvp_config as RSVPConfig | null;
        if (rsvpConfig?.deadline_date && new Date(rsvpConfig.deadline_date) < new Date()) {
          return new Response(JSON.stringify({ error: "RSVP deadline passed" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      await supabase
        .from("invite_parties")
        .update({ 
          rsvp_status: partyStatus,
          confirmed_by_guest_id: validGuest.id,
          last_updated_by_guest_id: validGuest.id,
          last_updated_at: new Date().toISOString(),
        })
        .eq("id", validGuest.party_id);

      for (const member of members) {
        const updateData: any = {
          rsvp_status: member.rsvpStatus,
          menu_choice: member.menuChoice,
          dietary_restrictions: member.dietaryRestrictions,
        };

        // Handle plus-one data
        if (member.plusOneName !== undefined) {
          updateData.plus_one_name = member.plusOneName || null;
        }
        if (member.plusOneMenu !== undefined) {
          updateData.plus_one_menu = member.plusOneMenu || null;
        }

        await supabase
          .from("guests")
          .update(updateData)
          .eq("id", member.id)
          .eq("party_id", validGuest.party_id);
      }

      await supabase.from("rsvp_log").insert({
        party_id: validGuest.party_id,
        guest_id_actor: validGuest.id,
        payload: { partyStatus, members, submittedAt: new Date().toISOString() },
      });

      console.log(`RSVP submitted for party ${validGuest.party_id} by guest ${validGuest.id}`);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("RSVP handler error:", error);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
