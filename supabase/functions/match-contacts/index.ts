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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { token, contacts } = await req.json();

    if (!token || !contacts) {
      throw new Error('Token and contacts are required');
    }

    // Validate token
    const { data: tokenData, error: tokenError } = await supabase
      .from('sync_tokens')
      .select('*')
      .eq('token', token)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (tokenError || !tokenData) {
      throw new Error('Invalid or expired token');
    }

    console.log('Token validated for user:', tokenData.user_id);

    // Get guests for this wedding
    const { data: guests, error: guestsError } = await supabase
      .from('guests')
      .select('id, first_name, last_name')
      .eq('wedding_id', tokenData.wedding_id);

    if (guestsError) {
      throw new Error('Failed to fetch guests');
    }

    console.log(`Matching ${contacts.length} contacts with ${guests.length} guests`);

    // Prepare prompt for AI matching
    const guestsList = guests.map(g => `${g.first_name} ${g.last_name}`).join('\n');
    const contactsList = contacts.map((c: any) => `${c.name} - ${c.phone}`).join('\n');

    const systemPrompt = `Sei un assistente per l'organizzazione di matrimoni. Il tuo compito è abbinare i contatti della rubrica telefonica agli invitati del matrimonio.

Regole di matching:
1. Confronta nomi e cognomi considerando varianti (es. "Giuseppe" = "Beppe", "Francesco" = "Franco")
2. Considera suffissi familiari (es. "Famiglia Rossi" può matchare "Mario Rossi")
3. Gestisci coppie (es. "Marco e Giulia" può matchare "Marco Bianchi" o "Giulia Verdi")
4. Assegna un confidence score da 0 a 100
5. Se il match non è sicuro (< 70%), restituisci null per quel guest

Restituisci un array JSON con questa struttura:
[
  {
    "guest_name": "Nome Completo Invitato",
    "contact_name": "Nome dal Contatto",
    "contact_phone": "+39...",
    "confidence_score": 85
  }
]

Se un invitato non ha match sicuro, non includerlo nell'array.`;

    const userPrompt = `Lista Invitati:\n${guestsList}\n\nContatti dalla Rubrica:\n${contactsList}`;

    // Call Lovable AI for matching
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }
      if (aiResponse.status === 402) {
        throw new Error('Insufficient AI credits. Please add funds.');
      }
      throw new Error('AI matching failed');
    }

    const aiData = await aiResponse.json();
    const matchesText = aiData.choices[0].message.content;
    
    // Parse AI response
    let matches = [];
    try {
      const jsonMatch = matchesText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        matches = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error('Failed to parse AI response:', e);
      matches = [];
    }

    console.log(`AI found ${matches.length} potential matches`);

    // Insert matches into temp table
    const matchRecords = [];
    for (const match of matches) {
      const guest = guests.find(g => 
        `${g.first_name} ${g.last_name}`.toLowerCase() === match.guest_name.toLowerCase()
      );
      
      if (guest) {
        matchRecords.push({
          user_id: tokenData.user_id,
          wedding_id: tokenData.wedding_id,
          guest_id: guest.id,
          contact_name: match.contact_name,
          contact_phone: match.contact_phone,
          confidence_score: match.confidence_score,
          status: 'pending',
        });
      }
    }

    if (matchRecords.length > 0) {
      const { error: insertError } = await supabase
        .from('contact_matches_temp')
        .insert(matchRecords);

      if (insertError) {
        console.error('Error inserting matches:', insertError);
        throw insertError;
      }
    }

    // Mark token as used
    await supabase
      .from('sync_tokens')
      .update({ used: true })
      .eq('id', tokenData.id);

    console.log(`Successfully created ${matchRecords.length} match records`);

    return new Response(
      JSON.stringify({ 
        success: true,
        matchesCount: matchRecords.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in match-contacts:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});