import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fileUrl, totalContract, weddingDate } = await req.json();
    console.log("[analyze-contract] Starting analysis for:", fileUrl);

    if (!fileUrl) {
      console.error("[analyze-contract] Missing fileUrl");
      return new Response(
        JSON.stringify({ error: "fileUrl is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("[analyze-contract] LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the Supabase URL and service role key for downloading the file
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error("[analyze-contract] Supabase credentials not configured");
      return new Response(
        JSON.stringify({ error: "Backend configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with service role to access private bucket
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Download the file from Supabase Storage
    console.log("[analyze-contract] Downloading file from storage");
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("vendor-contracts")
      .download(fileUrl);

    if (downloadError || !fileData) {
      console.error("[analyze-contract] Error downloading file:", downloadError);
      return new Response(
        JSON.stringify({ error: "Failed to download file" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Convert blob to base64 for sending to AI
    const arrayBuffer = await fileData.arrayBuffer();
    const base64File = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    
    // Determine file type from extension - only supported formats
    const fileExtension = fileUrl.split('.').pop()?.toLowerCase() || '';
    const mimeTypes: Record<string, string> = {
      'pdf': 'application/pdf',
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'heic': 'image/heic',
    };
    const mimeType = mimeTypes[fileExtension];
    
    if (!mimeType) {
      console.error("[analyze-contract] Unsupported file type:", fileExtension);
      return new Response(
        JSON.stringify({ error: `Formato file non supportato: ${fileExtension}. Usa PDF, PNG, JPG o HEIC.` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Construct the system prompt with vendor registry extraction
    const systemPrompt = `Sei un assistente di estrazione dati per contratti. Il tuo compito è LEGGERE il documento e COPIARE ESATTAMENTE ciò che è scritto.

REGOLE CRITICHE:
1. LEGGI ATTENTAMENTE il documento fornito
2. Estrai SOLO informazioni ESPLICITAMENTE SCRITTE nel documento
3. Se un dato NON È PRESENTE o NON È CHIARO, metti null
4. NON DEDURRE, NON INTERPRETARE, NON INVENTARE
5. Copia ESATTAMENTE il testo come appare nel documento

${weddingDate ? `Contesto: matrimonio in data ${weddingDate}` : ''}
${totalContract ? `Importo totale contratto: €${totalContract}` : ''}

OUTPUT RICHIESTO - JSON con 3 chiavi:

1. "anagrafica_fornitore" (oggetto):
   - ragione_sociale: nome completo del fornitore (null se non presente)
   - partita_iva_cf: P.IVA o CF (null se non presente)
   - indirizzo_sede_legale: indirizzo completo (null se non presente)
   - email: email o PEC (null se non presente)
   - telefono: numero di telefono (null se non presente)
   - iban: coordinate bancarie (null se non presente)
   - intestatario_conto: intestatario (null se non presente)

2. "pagamenti" (array di oggetti):
   - SOLO se il documento specifica chiaramente le rate di pagamento
   - Per ogni rata EFFETTIVAMENTE SCRITTA:
     * descrizione: descrizione testuale della rata
     * importo_tipo: "assoluto" o "percentuale"
     * importo_valore: numero (importo o percentuale)
     * data_tipo: "assoluta", "relativa_evento", o "trigger_testo"
     * data_valore: data o testo del trigger
   - SE NON CI SONO RATE SPECIFICATE, restituisci ARRAY VUOTO []

3. "punti_chiave" (oggetto):
   - SOLO clausole EFFETTIVAMENTE PRESENTI nel documento
   - penali_cancellazione: politica di cancellazione (null se non presente)
   - costi_occulti: costi extra/non inclusi ESPLICITAMENTE MENZIONATI (null se non presente)
   - piano_b: clausole su maltempo/forza maggiore (null se non presente)
   - responsabilita_extra: responsabilità del cliente (null se non presente)

VERIFICA FINALE: Prima di rispondere, rileggi il documento e assicurati che ogni dato provenga REALMENTE dal testo.

Restituisci SOLO JSON, nessun commento.`;

    console.log("[analyze-contract] Calling Lovable AI");
    
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "LEGGI ATTENTAMENTE questo documento. Estrai SOLO dati REALMENTE PRESENTI. Se qualcosa non c'è, metti null o array vuoto. NON INVENTARE."
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${base64File}`,
                },
              },
            ],
          },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("[analyze-contract] AI API error:", aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite di richieste superato. Riprova tra poco." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Crediti insufficienti. Aggiungi fondi al workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 400) {
        return new Response(
          JSON.stringify({ error: "L'AI non è riuscita a leggere il documento. Riprova con un file più chiaro." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "Errore durante l'analisi del contratto. Riprova o contatta il supporto." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    console.log("[analyze-contract] AI response received");
    console.log("[analyze-contract] AI raw response:", JSON.stringify(aiData).substring(0, 500));

    const aiContent = aiData.choices?.[0]?.message?.content;
    if (!aiContent) {
      console.error("[analyze-contract] No content in AI response");
      return new Response(
        JSON.stringify({ error: "Invalid AI response" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[analyze-contract] AI content length:", aiContent.length);

    // Extract JSON from response (remove markdown code blocks if present)
    let jsonContent = aiContent.trim();
    if (jsonContent.startsWith("```json")) {
      jsonContent = jsonContent.slice(7);
    }
    if (jsonContent.startsWith("```")) {
      jsonContent = jsonContent.slice(3);
    }
    if (jsonContent.endsWith("```")) {
      jsonContent = jsonContent.slice(0, -3);
    }
    jsonContent = jsonContent.trim();

    let analysisResult;
    try {
      analysisResult = JSON.parse(jsonContent);
      console.log("[analyze-contract] Parsed result:", JSON.stringify(analysisResult).substring(0, 500));
    } catch (parseError) {
      console.error("[analyze-contract] Failed to parse AI response:", parseError);
      console.error("[analyze-contract] AI content:", aiContent);
      return new Response(
        JSON.stringify({ error: "Failed to parse AI response" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[analyze-contract] Analysis successful");
    return new Response(
      JSON.stringify({ analysis: analysisResult }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[analyze-contract] Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});