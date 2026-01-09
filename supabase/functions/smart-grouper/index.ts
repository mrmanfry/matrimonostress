import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Validate Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.error("Missing or invalid Authorization header");
      return new Response(
        JSON.stringify({ error: "Unauthorized - missing auth token", suggestions: [] }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Create Supabase client with user's token
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // 3. Verify the user is authenticated
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      console.error("Invalid or expired token:", userError?.message);
      return new Response(
        JSON.stringify({ error: "Unauthorized - invalid token", suggestions: [] }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Parse request body
    const { guests, weddingId } = await req.json();
    
    if (!weddingId) {
      return new Response(
        JSON.stringify({ error: "wedding_id is required", suggestions: [] }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!guests || !Array.isArray(guests) || guests.length === 0) {
      return new Response(
        JSON.stringify({ error: "guests array is required", suggestions: [] }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 5. Verify user has access to this wedding (RLS will handle this)
    const { data: weddingAccess, error: accessError } = await supabaseClient
      .from("weddings")
      .select("id")
      .eq("id", weddingId)
      .maybeSingle();

    if (accessError || !weddingAccess) {
      console.error("Wedding access denied:", accessError?.message);
      return new Response(
        JSON.stringify({ error: "Access denied to this wedding", suggestions: [] }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 6. Validate that all guest IDs belong to this wedding
    const guestIds = guests.map((g: { id: string }) => g.id);
    const { data: validGuests, error: guestsError } = await supabaseClient
      .from("guests")
      .select("id")
      .eq("wedding_id", weddingId)
      .in("id", guestIds);

    if (guestsError) {
      console.error("Error validating guests:", guestsError.message);
      return new Response(
        JSON.stringify({ error: "Error validating guests", suggestions: [] }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const validGuestIds = new Set(validGuests?.map((g) => g.id) || []);
    const invalidGuests = guestIds.filter((id: string) => !validGuestIds.has(id));
    
    if (invalidGuests.length > 0) {
      console.error("Some guests don't belong to this wedding:", invalidGuests);
      return new Response(
        JSON.stringify({ error: "Some guests don't belong to this wedding", suggestions: [] }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 7. Now call the AI with validated data
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const systemPrompt = `Sei un assistente esperto per matrimoni. Il tuo compito è analizzare una lista di invitati e proporre raggruppamenti intelligenti in "Nuclei di Invito" (famiglie, coppie, gruppi di amici).

REGOLE DI RAGGRUPPAMENTO:
1. Stesso cognome → probabilmente famiglia
2. Parole chiave come "Zia", "Zio", "Cugino/a", "Nonna", "Nonno" → famiglia allargata
3. Nomi collegati con "e" o "&" → coppia
4. Pattern "Nome1 e Nome2 Cognome" → coppia sposata
5. Nomi simili o diminutivi (es. "Giovanni" e "Gianni") → stessa persona o famiglia
6. Se ci sono bambini con lo stesso cognome di adulti → nucleo familiare

OUTPUT:
Restituisci un array JSON di proposte. Ogni proposta deve avere:
- "party_name": Nome descrittivo del nucleo (es. "Famiglia Rossi", "Marco & Giulia")
- "guest_ids": Array di ID degli invitati da raggruppare
- "confidence": "high", "medium", o "low" in base alla certezza

IMPORTANTE: Raggruppa SOLO se sei abbastanza sicuro. Se un invitato non ha match chiari, non includerlo in nessun gruppo.`;

    const userPrompt = `Analizza questi invitati e proponi raggruppamenti:

${JSON.stringify(guests, null, 2)}

Restituisci solo l'array JSON delle proposte, senza altri testi.`;

    console.log(`Processing smart-grouper for user ${user.id}, wedding ${weddingId}, ${guests.length} guests`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    // Extract JSON from content
    let suggestions;
    try {
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || 
                       content.match(/\[[\s\S]*\]/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
      suggestions = JSON.parse(jsonStr);
    } catch (e) {
      console.error("Failed to parse AI response:", content);
      suggestions = [];
    }

    return new Response(
      JSON.stringify({ suggestions }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in smart-grouper:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage, suggestions: [] }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
