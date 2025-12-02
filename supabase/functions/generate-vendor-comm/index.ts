import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    const { 
      taskTitle, 
      taskDescription, 
      vendorName, 
      vendorCategory,
      channel, 
      tone, 
      senderName, 
      senderRole 
    } = await req.json();

    console.log('Generating vendor communication:', {
      taskTitle,
      vendorName,
      channel,
      tone,
      senderName,
      senderRole
    });

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Build role description
    const roleText = senderRole === 'groom' ? 'lo sposo' 
      : senderRole === 'bride' ? 'la sposa'
      : senderRole === 'planner' ? 'il wedding planner'
      : 'un organizzatore';

    // Build tone instruction
    const toneInstruction = tone === 'formal' 
      ? 'Usa un tono formale e professionale. Usa "Gentile" per i saluti e "Cordiali saluti" per la chiusura.'
      : 'Usa un tono amichevole e cordiale. Puoi usare "Ciao" e emoji con moderazione. Mantieni comunque rispetto.';

    // Build channel instruction
    const channelInstruction = channel === 'whatsapp'
      ? 'Il messaggio sarà inviato via WhatsApp. Mantienilo breve (max 4-5 righe). Puoi usare 1-2 emoji appropriate.'
      : 'Il messaggio sarà inviato via email. Scrivi una email professionale con saluti appropriati e una struttura chiara.';

    const systemPrompt = `Sei un assistente per la pianificazione di matrimoni. 
Agisci come ${senderName}, ${roleText} di questo matrimonio.
Stai scrivendo al fornitore "${vendorName}" (categoria: ${vendorCategory || 'non specificata'}).

${toneInstruction}
${channelInstruction}

L'obiettivo del messaggio è: ${taskTitle}${taskDescription ? ' - ' + taskDescription : ''}

NON inventare dettagli non forniti. Mantieni il messaggio chiaro e al punto.`;

    const userPrompt = channel === 'whatsapp'
      ? `Genera un breve messaggio WhatsApp per il fornitore.`
      : `Genera un'email per il fornitore. Includi oggetto e corpo separati.`;

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
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit superato. Riprova tra qualche minuto.' }), 
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Crediti AI esauriti. Contatta il supporto.' }), 
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error('AI gateway error');
    }

    const data = await response.json();
    const generatedText = data.choices[0].message.content;

    console.log('Generated text:', generatedText);

    // Parse output based on channel
    let result;
    if (channel === 'email') {
      // Try to extract subject and body
      const subjectMatch = generatedText.match(/Oggetto:\s*(.+?)(?:\n|$)/i);
      const subject = subjectMatch ? subjectMatch[1].trim() : taskTitle;
      
      // Remove subject line from body if present
      const body = generatedText.replace(/Oggetto:\s*.+?(?:\n|$)/i, '').trim();
      
      result = { subject, body };
    } else {
      result = { body: generatedText };
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-vendor-comm:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
