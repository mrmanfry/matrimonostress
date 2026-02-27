import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { weddingId, mode, draft_question, draft_answer } = await req.json();
    if (!weddingId) {
      return new Response(JSON.stringify({ error: "Missing weddingId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify ownership
    const { data: wedding, error: weddingError } = await supabase
      .from("weddings")
      .select("partner1_name, partner2_name, wedding_date, location, ceremony_venue_name, ceremony_venue_address, reception_venue_name, reception_venue_address, ceremony_start_time, reception_start_time")
      .eq("id", weddingId)
      .single();

    if (weddingError || !wedding) {
      return new Response(JSON.stringify({ error: "Wedding not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    // ── POLISH MODE: rewrite a single draft FAQ ──
    if (mode === "polish") {
      if (!draft_question && !draft_answer) {
        return new Response(JSON.stringify({ error: "Missing draft_question or draft_answer" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const polishPrompt = `Sei un wedding planner italiano esperto. Riscrivi questa FAQ per un sito di matrimonio in modo professionale, elegante e completo. Mantieni il significato originale ma migliora tono, grammatica e chiarezza.

Domanda bozza: ${String(draft_question || "").slice(0, 300)}
Risposta bozza: ${String(draft_answer || "").slice(0, 1000)}`;

      const polishResponse = await fetch(
        "https://ai.gateway.lovable.dev/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: "Riscrivi la FAQ in modo professionale. Rispondi solo tramite la tool call." },
              { role: "user", content: polishPrompt },
            ],
            temperature: 0.3,
            tools: [
              {
                type: "function",
                function: {
                  name: "return_polished_faq",
                  description: "Return a single polished FAQ",
                  parameters: {
                    type: "object",
                    properties: {
                      question: { type: "string" },
                      answer: { type: "string" },
                    },
                    required: ["question", "answer"],
                    additionalProperties: false,
                  },
                },
              },
            ],
            tool_choice: { type: "function", function: { name: "return_polished_faq" } },
          }),
          signal: controller.signal,
        }
      );

      clearTimeout(timeout);

      if (!polishResponse.ok) {
        const status = polishResponse.status;
        if (status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit exceeded, riprova tra poco" }), {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (status === 402) {
          return new Response(JSON.stringify({ error: "Crediti AI esauriti" }), {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const errText = await polishResponse.text();
        console.error("AI polish error:", status, errText);
        throw new Error("AI polish request failed");
      }

      const polishData = await polishResponse.json();
      const toolCall = polishData.choices?.[0]?.message?.tool_calls?.[0];
      if (!toolCall) throw new Error("No tool call in AI response");

      const parsed = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify({
        question: String(parsed.question || "").replace(/<[^>]*>/g, "").slice(0, 300),
        answer: String(parsed.answer || "").replace(/<[^>]*>/g, "").slice(0, 1000),
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── GENERATE MODE (default): generate 5-6 FAQ from scratch ──
    const prompt = `Sei un wedding planner italiano esperto. Genera 5-6 FAQ (domande frequenti) utili per gli invitati di un matrimonio, basandoti sui seguenti dettagli:

---
Coppia: ${wedding.partner1_name} & ${wedding.partner2_name}
Data: ${wedding.wedding_date}
Città: ${wedding.location || "non specificata"}
Cerimonia: ${wedding.ceremony_venue_name || "non specificata"} - ${wedding.ceremony_venue_address || ""}
Orario cerimonia: ${wedding.ceremony_start_time || "non specificato"}
Ricevimento: ${wedding.reception_venue_name || "non specificato"} - ${wedding.reception_venue_address || ""}
Orario ricevimento: ${wedding.reception_start_time || "non specificato"}
---

Le FAQ devono coprire argomenti pratici come:
- Parcheggio nelle vicinanze
- Distanza tra le location
- Bambini ammessi
- Dress code / abbigliamento consigliato
- Se il ricevimento è all'aperto
- Orari di arrivo consigliati

Rispondi SOLO con l'array JSON, senza markdown o altro testo. Ogni FAQ deve avere "question" e "answer" in italiano.`;

    const aiResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: "Rispondi SOLO con un array JSON valido. Nessun testo extra." },
            { role: "user", content: prompt },
          ],
          temperature: 0.3,
          tools: [
            {
              type: "function",
              function: {
                name: "return_faqs",
                description: "Return FAQ list for wedding guests",
                parameters: {
                  type: "object",
                  properties: {
                    faqs: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          question: { type: "string" },
                          answer: { type: "string" },
                        },
                        required: ["question", "answer"],
                        additionalProperties: false,
                      },
                    },
                  },
                  required: ["faqs"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "return_faqs" } },
        }),
        signal: controller.signal,
      }
    );

    clearTimeout(timeout);

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, riprova tra poco" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Crediti AI esauriti" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("AI error:", status, errText);
      throw new Error("AI request failed");
    }

    const aiData = await aiResponse.json();
    
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error("No tool call in AI response");
    }

    const parsed = JSON.parse(toolCall.function.arguments);
    const faqs = parsed.faqs || [];

    const sanitized = faqs.slice(0, 8).map((faq: any) => ({
      question: String(faq.question || "").replace(/<[^>]*>/g, "").slice(0, 300),
      answer: String(faq.answer || "").replace(/<[^>]*>/g, "").slice(0, 1000),
    }));

    return new Response(JSON.stringify({ faqs: sanitized }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("generate-rsvp-faqs error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
