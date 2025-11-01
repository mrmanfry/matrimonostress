import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { guests } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    // Prepara il prompt per l'AI
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

    // Chiamata a Lovable AI
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

    // Estrai JSON dal contenuto (potrebbe essere wrappato in ```json)
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
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in smart-grouper:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage, suggestions: [] }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
