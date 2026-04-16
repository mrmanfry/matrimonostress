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

interface CampaignConfig {
  status: string;
  enabled: boolean;
  hero_image_url: string | null;
  welcome_title: string;
  welcome_text: string;
  deadline_date: string | null;
}

interface CampaignsConfig {
  save_the_date: CampaignConfig;
  rsvp: CampaignConfig;
  theme: {
    layout_mode: string;
    font_family: "serif" | "sans" | "elegant";
    primary_color: string;
    show_countdown: boolean;
    show_powered_by: boolean;
  };
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
      const { action, token, partyStatus, members, stdResponse } = body;

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
          .select("id, first_name, last_name, alias, rsvp_status, menu_choice, dietary_restrictions, party_id, allow_plus_one, plus_one_name, plus_one_menu, wedding_id, is_child, save_the_date_sent_at, formal_invite_sent_at, std_response, std_responded_at")
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
            .select("id, first_name, last_name, alias, rsvp_status, menu_choice, dietary_restrictions, is_child, allow_plus_one, plus_one_name, plus_one_menu, save_the_date_sent_at, formal_invite_sent_at, std_response")
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
            alias: guestData.alias,
            rsvp_status: guestData.rsvp_status,
            menu_choice: guestData.menu_choice,
            dietary_restrictions: guestData.dietary_restrictions,
            is_child: guestData.is_child,
            allow_plus_one: guestData.allow_plus_one,
            plus_one_name: guestData.plus_one_name,
            plus_one_menu: guestData.plus_one_menu,
            save_the_date_sent_at: guestData.save_the_date_sent_at,
            formal_invite_sent_at: guestData.formal_invite_sent_at,
            std_response: guestData.std_response,
          }];
        }

        // Get wedding data - including campaigns_config, venue details, and timing
        const { data: wedding } = await supabase
          .from("weddings")
          .select("partner1_name, partner2_name, wedding_date, rsvp_config, campaigns_config, catering_config, location, ceremony_start_time, timezone, ceremony_venue_name, ceremony_venue_address, reception_venue_name, reception_venue_address, reception_start_time")
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

// Helper per gestire stringhe vuote/solo spazi
        const getValidString = (value: string | null | undefined, fallback: string): string => {
          return value?.trim() ? value : fallback;
        };

        // Parse campaigns_config (new) or fall back to rsvp_config (legacy)
        const campaignsConfig = wedding?.campaigns_config as CampaignsConfig | null;
        
        // Build RSVP config (for the formal RSVP page) - use RSVP campaign settings
        const rsvpConfig: RSVPConfig = campaignsConfig
          ? {
              hero_image_url: campaignsConfig.rsvp.hero_image_url,
              welcome_title: getValidString(campaignsConfig.rsvp.welcome_title, "Conferma la tua Presenza"),
              welcome_text: getValidString(campaignsConfig.rsvp.welcome_text, "Non vediamo l'ora di festeggiare con voi!"),
              deadline_date: campaignsConfig.rsvp.deadline_date,
            }
          : wedding?.rsvp_config || {
              hero_image_url: null,
              welcome_title: "Conferma la tua Presenza",
              welcome_text: "Non vediamo l'ora di festeggiare con voi!",
              deadline_date: null,
            };

        // Build STD config (for Save The Date page) - use STD campaign settings with proper defaults
        const stdConfig: RSVPConfig | null = campaignsConfig
          ? {
              hero_image_url: campaignsConfig.save_the_date.hero_image_url,
              welcome_title: getValidString(campaignsConfig.save_the_date.welcome_title, "Save The Date!"),
              welcome_text: getValidString(campaignsConfig.save_the_date.welcome_text, "Segnati questa data!"),
              deadline_date: campaignsConfig.save_the_date.deadline_date,
            }
          : null;

        // Extract theme for new structure
        const theme = campaignsConfig?.theme || null;

        // Check if deadline has passed (use RSVP deadline for read-only state)
        const isReadOnly = rsvpConfig.deadline_date 
          ? new Date(rsvpConfig.deadline_date) < new Date() 
          : false;

        // Extract FAQ and gift info from campaigns_config
        const rsvpCampaign = campaignsConfig?.rsvp as any;
        const faqsData = rsvpCampaign?.faqs || [];
        const giftInfoData = rsvpCampaign?.gift_info || null;

        console.log(`RSVP data fetched for guest ${guestData.id}, party: ${party.id}, faqs: ${faqsData.length}, giftEnabled: ${giftInfoData?.enabled}`);

        return new Response(JSON.stringify({
          guest: {
            id: guestData.id,
            firstName: guestData.first_name,
            lastName: guestData.last_name,
            alias: guestData.alias,
            stdResponse: guestData.std_response,
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
            location: wedding?.location || null,
            ceremonyStartTime: wedding?.ceremony_start_time || null,
            timezone: wedding?.timezone || null,
            ceremonyVenueName: wedding?.ceremony_venue_name || null,
            ceremonyVenueAddress: wedding?.ceremony_venue_address || null,
            receptionVenueName: wedding?.reception_venue_name || null,
            receptionVenueAddress: wedding?.reception_venue_address || null,
            receptionStartTime: wedding?.reception_start_time || null,
            ceremonyImageUrl: rsvpCampaign?.ceremony_image_url || null,
            receptionImageUrl: rsvpCampaign?.reception_image_url || null,
          },
          config: rsvpConfig,
          stdConfig,
          theme,
          faqs: faqsData,
          giftInfo: giftInfoData,
          cateringConfig: wedding?.catering_config || null,
          isReadOnly,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Handle SAVE-STD-RESPONSE action (Save The Date soft response)
      // KEY FEATURE: Propagates response to ALL family nucleus members
      if (action === "save-std-response" && stdResponse) {
        console.log(`Saving STD response: ${stdResponse} for token: ${token.substring(0, 8)}...`);
        
        // Validate stdResponse value
        if (!['likely_yes', 'likely_no', 'unsure'].includes(stdResponse)) {
          return new Response(JSON.stringify({ error: "Invalid stdResponse value" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Find guest by token - include party_id for propagation logic
        const { data: guest, error: guestError } = await supabase
          .from("guests")
          .select("id, wedding_id, party_id")
          .eq("unique_rsvp_token", token)
          .single();

        if (guestError || !guest) {
          console.log("Guest not found for STD response");
          return new Response(JSON.stringify({ error: "Token not found" }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const now = new Date().toISOString();
        let updatedCount = 0;

        // PROPAGATION LOGIC: If guest belongs to a party, update ALL members
        if (guest.party_id) {
          console.log(`Guest ${guest.id} belongs to party ${guest.party_id} - propagating STD response to all members`);
          
          const { error: updateError, count } = await supabase
            .from("guests")
            .update({ 
              std_response: stdResponse,
              std_responded_at: now,
            })
            .eq("party_id", guest.party_id)
            .select("id");

          if (updateError) {
            console.error("Error updating STD response for party:", updateError);
            return new Response(JSON.stringify({ error: "Failed to save response" }), {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }

          updatedCount = count || 0;
          console.log(`STD response propagated to ${updatedCount} members of party ${guest.party_id}`);
        } else {
          // SINGLE GUEST: Update only their record
          console.log(`Guest ${guest.id} is single (no party_id) - updating only their record`);
          
          const { error: updateError } = await supabase
            .from("guests")
            .update({ 
              std_response: stdResponse,
              std_responded_at: now,
            })
            .eq("id", guest.id);

          if (updateError) {
            console.error("Error updating STD response:", updateError);
            return new Response(JSON.stringify({ error: "Failed to save response" }), {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }

          updatedCount = 1;
          console.log(`STD response saved for single guest ${guest.id}`);
        }

        return new Response(JSON.stringify({ 
          success: true,
          propagated: guest.party_id ? true : false,
          updatedCount,
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

        // Helper: promote, update or remove a +1 as a real guest record
        const syncPlusOneGuest = async (
          hostId: string,
          weddingId: string,
          partyId: string | null,
          rsvpStatus: string,
          plusOneName: string | null | undefined,
          plusOneMenu: string | null | undefined,
        ) => {
          const trimmedName = (plusOneName || "").trim();
          const shouldExist = rsvpStatus === "confirmed" && trimmedName.length > 0;

          // Find existing promoted +1
          const { data: existingPlusOne } = await supabase
            .from("guests")
            .select("id")
            .eq("plus_one_of_guest_id", hostId)
            .maybeSingle();

          if (!shouldExist) {
            if (existingPlusOne?.id) {
              await supabase.from("guests").delete().eq("id", existingPlusOne.id);
              console.log(`Removed +1 guest ${existingPlusOne.id} for host ${hostId}`);
            }
            return;
          }

          // Split name
          const nameParts = trimmedName.split(/\s+/);
          const firstName = nameParts[0];
          const lastName = nameParts.slice(1).join(" ") || "";

          if (existingPlusOne?.id) {
            await supabase
              .from("guests")
              .update({
                first_name: firstName,
                last_name: lastName,
                menu_choice: plusOneMenu || null,
                rsvp_status: "confirmed",
              })
              .eq("id", existingPlusOne.id);
            console.log(`Updated +1 guest ${existingPlusOne.id} for host ${hostId}`);
          } else {
            const insertPayload: any = {
              wedding_id: weddingId,
              first_name: firstName,
              last_name: lastName,
              rsvp_status: "confirmed",
              menu_choice: plusOneMenu || null,
              adults_count: 1,
              children_count: 0,
              is_child: false,
              allow_plus_one: false,
              is_couple_member: false,
              plus_one_of_guest_id: hostId,
            };
            if (partyId) insertPayload.party_id = partyId;

            const { data: inserted, error: insertError } = await supabase
              .from("guests")
              .insert(insertPayload)
              .select("id")
              .single();

            if (insertError) {
              console.error(`Failed to insert +1 for host ${hostId}:`, insertError);
            } else {
              console.log(`Promoted +1 guest ${inserted?.id} for host ${hostId}`);
            }
          }
        };

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

            // Sync +1 promotion for this member
            await syncPlusOneGuest(
              member.id,
              validGuest.wedding_id,
              validGuest.party_id,
              member.rsvpStatus,
              member.plusOneName,
              member.plusOneMenu,
            );
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

            // Re-fetch party_id (ensure_party_for_rsvp trigger may have created one)
            const { data: refreshedGuest } = await supabase
              .from("guests")
              .select("party_id")
              .eq("id", validGuest.id)
              .single();

            // Sync +1 promotion for the single guest (host)
            await syncPlusOneGuest(
              validGuest.id,
              validGuest.wedding_id,
              refreshedGuest?.party_id || null,
              member.rsvpStatus,
              member.plusOneName,
              member.plusOneMenu,
            );

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
