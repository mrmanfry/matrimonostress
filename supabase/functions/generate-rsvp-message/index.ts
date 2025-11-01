import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { coupleName } = await req.json();

    const response = await fetch('https://api.lovable.app/inference/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
      },
      body: JSON.stringify({
        model: 'openai/gpt-5-nano',
        messages: [
          {
            role: 'system',
            content: 'Sei un assistente che scrive messaggi di invito a matrimoni in italiano. Crea messaggi calorosi, personali ed emozionanti. Usa emoji con moderazione. Mantieni un tono amichevole ma elegante.',
          },
          {
            role: 'user',
            content: `Scrivi un messaggio WhatsApp per invitare gli ospiti al matrimonio di ${coupleName}. Il messaggio deve includere le variabili [NomeInvitato], [LINK_RSVP] e [NomeCoppia]. Massimo 3-4 righe, tono caldo e festoso.`,
          },
        ],
        temperature: 0.8,
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      throw new Error('Errore nella generazione del messaggio');
    }

    const data = await response.json();
    const message = data.choices[0].message.content;

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
