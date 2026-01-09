import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ParsedGuest {
  nome_proposto: string;
  adulti_stimati: number;
  bambini_stimati: number;
  gruppo_proposto?: string;
  note?: string;
  testo_originale: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Validate Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.error("Missing or invalid Authorization header");
      return new Response(
        JSON.stringify({ error: "Unauthorized - missing auth token" }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
        JSON.stringify({ error: "Unauthorized - invalid token" }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Parse and validate request body
    const { text, weddingId } = await req.json();
    
    if (!text || typeof text !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Il testo è obbligatorio' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Limit text length
    if (text.length > 10000) {
      return new Response(
        JSON.stringify({ error: 'Il testo è troppo lungo. Massimo 10.000 caratteri.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 5. Optional: validate wedding access if weddingId is provided
    if (weddingId) {
      const { data: weddingAccess, error: accessError } = await supabaseClient
        .from("weddings")
        .select("id")
        .eq("id", weddingId)
        .maybeSingle();

      if (accessError || !weddingAccess) {
        console.error("Wedding access denied:", accessError?.message);
        return new Response(
          JSON.stringify({ error: "Access denied to this wedding" }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Log the request for audit
    console.log(`parse-guest-text called by user ${user.id}${weddingId ? ` for wedding ${weddingId}` : ''}, text length: ${text.length}`);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY non configurata');
    }

    const systemPrompt = `Sei un assistente esperto nell'organizzazione di matrimoni. Il tuo compito è analizzare liste di invitati grezze e trasformarle in dati strutturati.

Per ogni invitato o nucleo familiare che riesci ad identificare, restituisci un oggetto JSON con questi campi:
- "nome_proposto": il nome dell'invitato o della famiglia
- "adulti_stimati": numero di adulti (usa 1 se non specificato)
- "bambini_stimati": numero di bambini (usa 0 se non specificato)
- "gruppo_proposto": se identifichi un gruppo (es. "Amici Sposa", "Colleghi"), inseriscilo qui, altrimenti null
- "note": qualsiasi informazione aggiuntiva o ambigua (testo tra parentesi non numerico come "single", "da confermare", "forse +1")
- "testo_originale": la riga/porzione di testo originale da cui hai estratto questo invitato

REGOLE IMPORTANTI:
1. Pattern numerici:
   - "(2)" o "2" significa 2 adulti, 0 bambini
   - "(2+1)" o "2+1" significa 2 adulti, 1 bambino
   - "(4 persone)" significa 4 adulti, 0 bambini
   
2. Separatori: ogni nuova riga è un potenziale nuovo invitato. Riconosci anche liste separate da virgole o bullet point (*, -, •)

3. Gruppi: se vedi pattern come "Amici Sposo: Mario, Luca" crea invitati separati per Mario e Luca con gruppo_proposto "Amici Sposa"

4. Ambiguità: qualsiasi testo non chiaro va nelle note, NON fare assunzioni sui numeri. "Andrea (forse con Vale?)" = 1 adulto con nota "forse con Vale?", NON 2 adulti

5. Placeholder aggregati: "Colleghi di Sara (8)" può essere un singolo record placeholder con 8 adulti e nota che va dettagliato

6. Se non capisci una riga, ignorala (non creare un record)

Restituisci SOLO un array JSON valido di oggetti, senza altro testo.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Analizza questa lista di invitati:\n\n${text}` }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Limite di richieste superato. Riprova tra qualche minuto.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Crediti esauriti. Aggiungi crediti al tuo workspace Lovable.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error('Errore nel gateway AI');
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('Nessuna risposta dall\'AI');
    }

    // Parse the JSON response
    let parsedGuests: ParsedGuest[];
    try {
      // Try to extract JSON from the response (in case there's text around it)
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        parsedGuests = JSON.parse(jsonMatch[0]);
      } else {
        parsedGuests = JSON.parse(content);
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      return new Response(
        JSON.stringify({ 
          error: 'Non sono riuscito a interpretare il testo. Prova a formattarlo in modo più semplice (ad esempio, un invitato per riga).',
          details: content 
        }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate the parsed data
    if (!Array.isArray(parsedGuests) || parsedGuests.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'Nessun invitato riconosciuto nel testo. Prova a formattarlo in modo più chiaro.' 
        }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ guests: parsedGuests }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in parse-guest-text function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Errore interno del server' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
