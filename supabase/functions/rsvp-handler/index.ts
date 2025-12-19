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
    if (req.method === "POST") {
      const body = await req.json();
      const { action, token, partyStatus, members } = body;

      // Validate token
      if (!token || token.length < 20) {
        console.log("Invalid token format received");
        return new Response(JSON.stringify({ error: "Invalid token" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Handle FETCH action (retrieve RSVP data)
      if (action === "fetch") {
        // Query 1: Find guest by token
        const { data: guestData, error: guestError } = await supabase
          .from("guests")
          .select("id, first_name, last_name, rsvp_status, menu_choice, dietary_restrictions, party_id, allow_plus_one, plus_one_name, plus_one_menu, wedding_id, is_child")
          .eq("unique_rsvp_token", token)
          .single();

        if (guestError || !guestData) {
          console.log("Guest not found for token:", token.substring(0, 8) + "...");
          return new Response(JSON.stringify({ error: "Token not found" }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        let party: any;
        let partyMembers: any[];
        let weddingId: string;

        // BIFURCATION: NUCLEO vs SINGOLO
        if (guestData.party_id) {
          // SCENARIO A: Guest belongs to a party (nucleo)
          console.log(`Guest ${guestData.id} belongs to party ${guestData.party_id}`);
          
          const { data: partyData, error: partyError } = await supabase
            .from("invite_parties")
            .select("id, party_name, rsvp_status, wedding_id, last_updated_by_guest_id, last_updated_at")
            .eq("id", guestData.party_id)
            .single();

          if (partyError || !partyData) {
            console.log("Party not found for guest:", guestData.id);
            return new Response(JSON.stringify({ error: "Party not found" }), {
              status: 404,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }

          party = partyData;
          weddingId = partyData.wedding_id;

          const { data: members } = await supabase
            .from("guests")
            .select("id, first_name, last_name, rsvp_status, menu_choice, dietary_restrictions, is_child, allow_plus_one, plus_one_name, plus_one_menu")
            .eq("party_id", guestData.party_id);

          partyMembers = members || [];
        } else {
          // SCENARIO B: Guest is a SINGLE (no party_id)
          console.log(`Guest ${guestData.id} is a single (no party_id) - creating virtual party`);
          
          weddingId = guestData.wedding_id;
          
          // Create a "virtual party" for the single guest
          party = {
            id: `virtual-${guestData.id}`,
            party_name: `${guestData.first_name} ${guestData.last_name}`,
            rsvp_status: guestData.rsvp_status === 'confirmed' ? 'Confermato' : 
                         guestData.rsvp_status === 'declined' ? 'Rifiutato' : 'In attesa',
            wedding_id: weddingId,
            last_updated_by_guest_id: null,
            last_updated_at: null,
          };
          
          // The single guest is the only "member"
          partyMembers = [{
            id: guestData.id,
            first_name: guestData.first_name,
            last_name: guestData.last_name,
            rsvp_status: guestData.rsvp_status,
            menu_choice: guestData.menu_choice,
            dietary_restrictions: guestData.dietary_restrictions,
            is_child: guestData.is_child,
            allow_plus_one: guestData.allow_plus_one,
            plus_one_name: guestData.plus_one_name,
            plus_one_menu: guestData.plus_one_menu,
          }];
        }

        // Get wedding data
        const { data: wedding } = await supabase
          .from("weddings")
          .select("partner1_name, partner2_name, wedding_date, rsvp_config")
          .eq("id", weddingId)
          .single();

        // Get last editor name if someone else responded (only for real parties)
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

        console.log(`RSVP data fetched for guest ${guestData.id}, party: ${party.id}`);

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

      // Handle SUBMIT action (save RSVP response)
      if (partyStatus && members) {
        const { data: validGuest, error: validateError } = await supabase
          .from("guests")
          .select("id, party_id, wedding_id")
          .eq("unique_rsvp_token", token)
          .single();

        if (validateError || !validGuest) {
          console.log("Invalid token validation failed");
          return new Response(JSON.stringify({ error: "Invalid token" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Get wedding for deadline check
        const { data: wedding } = await supabase
          .from("weddings")
          .select("rsvp_config")
          .eq("id", validGuest.wedding_id)
          .single();

        const rsvpConfig = wedding?.rsvp_config as RSVPConfig | null;
        if (rsvpConfig?.deadline_date && new Date(rsvpConfig.deadline_date) < new Date()) {
          return new Response(JSON.stringify({ error: "RSVP deadline passed" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Update party status ONLY if guest has a real party_id
        if (validGuest.party_id) {
          await supabase
            .from("invite_parties")
            .update({ 
              rsvp_status: partyStatus,
              confirmed_by_guest_id: validGuest.id,
              last_updated_by_guest_id: validGuest.id,
              last_updated_at: new Date().toISOString(),
            })
            .eq("id", validGuest.party_id);

          // Update all members of the party
          for (const member of members) {
            const updateData: any = {
              rsvp_status: member.rsvpStatus,
              menu_choice: member.menuChoice,
              dietary_restrictions: member.dietaryRestrictions,
            };

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

          // Log the RSVP submission
          await supabase.from("rsvp_log").insert({
            party_id: validGuest.party_id,
            guest_id_actor: validGuest.id,
            payload: { partyStatus, members, submittedAt: new Date().toISOString() },
          });

          console.log(`RSVP submitted for party ${validGuest.party_id} by guest ${validGuest.id}`);
        } else {
          // SINGLE GUEST: Update only themselves (no party_id)
          const member = members[0]; // Single guests have only one member
          if (member) {
            const updateData: any = {
              rsvp_status: member.rsvpStatus,
              menu_choice: member.menuChoice,
              dietary_restrictions: member.dietaryRestrictions,
            };

            if (member.plusOneName !== undefined) {
              updateData.plus_one_name = member.plusOneName || null;
            }
            if (member.plusOneMenu !== undefined) {
              updateData.plus_one_menu = member.plusOneMenu || null;
            }

            await supabase
              .from("guests")
              .update(updateData)
              .eq("id", validGuest.id);

            console.log(`RSVP submitted for single guest ${validGuest.id} with status: ${member.rsvpStatus}`);
          }
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "Invalid request" }), {
        status: 400,
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
