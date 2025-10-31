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
    const systemPrompt = `Sei un assistente legale e contabile specializzato in contratti per eventi e matrimoni italiani.
Analizza il seguente documento (OCR se è un'immagine).
${weddingDate ? `Il contesto del progetto è un matrimonio che si terrà in data: ${weddingDate}.` : ''}
${totalContract ? `Il costo totale del contratto è: €${totalContract}.` : ''}

REGOLA CRITICA: Devi LEGGERE ATTENTAMENTE il documento e ESTRARRE SOLO i dati EFFETTIVAMENTE PRESENTI. 
SE UN DATO NON È PRESENTE NEL DOCUMENTO, DEVI RESTITUIRE null PER QUEL CAMPO.
NON INVENTARE O DEDURRE DATI CHE NON SONO ESPLICITAMENTE SCRITTI NEL DOCUMENTO.

Il tuo output DEVE essere un singolo oggetto JSON con TRE chiavi principali: "anagrafica_fornitore", "pagamenti", e "punti_chiave".

1. **Chiave "anagrafica_fornitore":**
   * Deve essere un oggetto.
   * Estrai i seguenti dati ANAGRAFICI del fornitore SOLO SE PRESENTI nel documento (cerca nell'intestazione, nel piè di pagina, o nelle clausole di pagamento):
       * \`ragione_sociale\`: (stringa o null) Il nome legale completo del fornitore.
       * \`partita_iva_cf\`: (stringa o null) La Partita IVA o Codice Fiscale.
       * \`indirizzo_sede_legale\`: (stringa o null) L'indirizzo completo della sede legale.
       * \`email\`: (stringa o null) L'email di contatto o PEC.
       * \`telefono\`: (stringa o null) Il numero di telefono.
       * \`iban\`: (stringa o null) Le coordinate bancarie IBAN per il pagamento.
       * \`intestatario_conto\`: (stringa o null) L'intestatario del conto bancario (se specificato).
   * SE NON TROVI UN DATO, METTI null. NON INVENTARE.

2. **Chiave "pagamenti":**
   * Deve essere un array di oggetti.
   * Per ogni pagamento/rata EFFETTIVAMENTE MENZIONATO nel documento, estrai:
       * \`descrizione\`: La descrizione testuale (es. "Acconto", "Saldo").
       * \`importo_tipo\`: (stringa) "assoluto" o "percentuale".
       * \`importo_valore\`: (numero) L'importo in EUR o il valore percentuale.
       * \`data_tipo\`: (stringa) "assoluta" (se è una data fissa), "relativa_evento" (se è X giorni prima/dopo la data del matrimonio), "trigger_testo" (se è "alla firma", "alla consegna", etc.).
       * \`data_valore\`: (stringa/numero) Il valore della data (es. "2026-11-15", -30, "alla firma").
   * SE NON CI SONO RATE SPECIFICATE, RESTITUISCI UN ARRAY VUOTO [].

3. **Chiave "punti_chiave":**
   * Deve essere un oggetto.
   * Cerca e riassumi in 1-2 frasi (in italiano) SOLO le clausole EFFETTIVAMENTE PRESENTI relative a:
       * \`penali_cancellazione\`: (stringa o null) Politica di cancellazione.
       * \`costi_occulti\`: (stringa o null) Qualsiasi costo menzionato come "extra", "non incluso", "a parte" (es. trasferta, staff extra, ore notturne).
       * \`piano_b\`: (stringa o null) Menzioni a "maltempo", "pioggia", "forza maggiore", "Piano B".
       * \`responsabilita_extra\`: (stringa o null) Qualsiasi responsabilità addossata al cliente (es. "SIAE", "permessi").
   * SE UNA CLAUSOLA NON È PRESENTE, METTI null.

IMPORTANTE: Restituisci SOLO l'oggetto JSON, senza alcun testo aggiuntivo o commenti.
VERIFICA DI AVER LETTO IL DOCUMENTO PRIMA DI RISPONDERE.`;

    console.log("[analyze-contract] Calling Lovable AI");
    
    // For PDFs, use inline_data format; for images, use image_url format
    const userContent = mimeType === 'application/pdf' 
      ? [
          {
            type: "text",
            text: "Analizza questo documento contrattuale."
          },
          {
            type: "inline_data",
            inline_data: {
              mime_type: mimeType,
              data: base64File
            }
          }
        ]
      : [
          {
            type: "image_url",
            image_url: {
              url: `data:${mimeType};base64,${base64File}`,
            },
          },
        ];

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: userContent,
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