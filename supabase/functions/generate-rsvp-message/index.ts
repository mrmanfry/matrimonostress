import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { coupleName, campaignType = 'rsvp' } = await req.json();

    // Prompt diversi per STD vs RSVP
    const systemPromptSTD = `Sei un assistente che scrive messaggi "Save The Date" per matrimoni in italiano. 
Crea messaggi leggeri, anticipatori e festosi. NON chiedere conferme definitive o dettagli come menu/allergie. 
Il tono deve essere: "Segnati questa data!" non "Confermi la presenza?". 
Usa emoji con moderazione. Mantieni un tono amichevole ma elegante.`;

    const systemPromptRSVP = `Sei un assistente che scrive messaggi di invito ufficiale a matrimoni in italiano. 
Crea messaggi calorosi, personali ed emozionanti che richiedono una conferma di presenza. 
Usa emoji con moderazione. Mantieni un tono amichevole ma elegante.`;

    const userPromptSTD = `Scrivi un messaggio WhatsApp "Save The Date" per il matrimonio di ${coupleName}. 
Il messaggio deve:
- Annunciare la data del matrimonio con entusiasmo
- Invitare a "segnare la data in agenda"
- NON chiedere conferme definitive o dettagli
- Includere le variabili [NomeInvitato], [LINK_STD] e [NomeCoppia]
- Massimo 3 righe, tono leggero e anticipatorio`;

    const userPromptRSVP = `Scrivi un messaggio WhatsApp per invitare ufficialmente gli ospiti al matrimonio di ${coupleName}. 
Il messaggio deve includere le variabili [NomeInvitato], [LINK_RSVP] e [NomeCoppia]. 
Massimo 3-4 righe, tono caldo e festoso.`;

    const isSTD = campaignType === 'save_the_date';
    const systemPrompt = isSTD ? systemPromptSTD : systemPromptRSVP;
    const userPrompt = isSTD ? userPromptSTD : userPromptRSVP;

    console.log(`Generating message for campaign type: ${campaignType}`);

    const response = await fetch('https://api.lovable.app/inference/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
      },
      body: JSON.stringify({
        model: 'openai/gpt-5-nano',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.8,
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      throw new Error('Errore nella generazione del messaggio');
    }

    const data = await response.json();
    const message = data.choices[0].message.content;

    console.log(`Message generated successfully for ${campaignType}`);

    return new Response(
      JSON.stringify({ message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
