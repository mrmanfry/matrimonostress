import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

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
}

interface ExistingGuest {
  id: string;
  first_name: string;
  last_name: string;
  adults_count: number | null;
  children_count: number | null;
  party_id: string | null;
  phone: string | null;
}

interface DiffMatch {
  parsed: ParsedGuest;
  existing: ExistingGuest;
  confidence: number;
}

interface DiffResult {
  exact_matches: DiffMatch[];
  fuzzy_matches: DiffMatch[];
  new_entries: ParsedGuest[];
  missing_in_new: ExistingGuest[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, weddingId } = await req.json();
    
    if (!text || typeof text !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Il testo è obbligatorio' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!weddingId) {
      return new Response(
        JSON.stringify({ error: 'weddingId è obbligatorio' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (text.length > 10000) {
      return new Response(
        JSON.stringify({ error: 'Il testo è troppo lungo. Massimo 10.000 caratteri.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY non configurata');
    }
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Configurazione Supabase mancante');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch existing guests from DB
    console.log('Fetching existing guests for wedding:', weddingId);
    const { data: existingGuests, error: fetchError } = await supabase
      .from('guests')
      .select('id, first_name, last_name, adults_count, children_count, party_id, phone')
      .eq('wedding_id', weddingId);

    if (fetchError) {
      console.error('Error fetching guests:', fetchError);
      throw new Error('Errore nel recupero degli invitati esistenti');
    }

    const existingGuestsList: ExistingGuest[] = existingGuests || [];
    console.log(`Found ${existingGuestsList.length} existing guests`);

    // Format existing guests for AI comparison
    const existingGuestsFormatted = existingGuestsList.map(g => 
      `${g.first_name} ${g.last_name} (ID: ${g.id}, Adulti: ${g.adults_count || 1}, Bambini: ${g.children_count || 0})`
    ).join('\n');

    const systemPrompt = `Sei un assistente esperto nell'organizzazione di matrimoni. Il tuo compito è:
1. Analizzare una nuova lista di invitati (TESTO NUOVO)
2. Confrontarla con la lista esistente nel database (LISTA ESISTENTE)
3. Identificare match, possibili duplicati e nuovi invitati

REGOLE DI PARSING del TESTO NUOVO:
- Pattern numerici: "(2)" = 2 adulti; "(2+1)" = 2 adulti, 1 bambino
- Ogni riga è un potenziale invitato
- "Famiglia Rossi (4)" = 1 record con 4 adulti

REGOLE DI MATCHING:
- Calcola un confidence score da 0 a 100 per ogni possibile match
- > 85%: Match esatto (stesso nome, stesso cognome)
- 50-85%: Match probabile (nickname vs nome completo, errori di battitura, diminutivi)
- < 50%: Persone diverse

ESEMPI DI FUZZY MATCH:
- "Zio Beppe" vs "Giuseppe Verdi" → 70% (diminutivo)
- "Marco R." vs "Marco Rossi" → 80% (abbreviazione)
- "Ale" vs "Alessandro" → 75% (diminutivo)
- "Mario Rossi" vs "Maria Rossi" → 40% (nomi simili ma diversi!)

Restituisci SOLO un oggetto JSON con questa struttura:
{
  "parsed_guests": [
    { "nome_proposto": "...", "adulti_stimati": N, "bambini_stimati": N, "gruppo_proposto": "..." o null, "note": "..." o null }
  ],
  "matches": [
    { "parsed_index": 0, "existing_id": "uuid", "confidence": 92 }
  ]
}

IMPORTANTE:
- parsed_index è l'indice nell'array parsed_guests
- existing_id è l'ID dell'invitato esistente
- Se un invitato nuovo non matcha con nessuno esistente, NON includerlo in matches
- Se un invitato esistente non è presente nel nuovo testo, NON includerlo`;

    const userPrompt = `LISTA ESISTENTE NEL DATABASE:
${existingGuestsFormatted || '(nessun invitato esistente)'}

TESTO NUOVO DA ANALIZZARE:
${text}

Analizza e confronta le due liste.`;

    console.log('Calling AI for diff analysis...');
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
        temperature: 0.2,
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

    console.log('AI response received, parsing...');

    // Parse the JSON response
    let aiResult: { parsed_guests: ParsedGuest[]; matches: { parsed_index: number; existing_id: string; confidence: number }[] };
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        aiResult = JSON.parse(jsonMatch[0]);
      } else {
        aiResult = JSON.parse(content);
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      return new Response(
        JSON.stringify({ 
          error: 'Non sono riuscito a interpretare il testo. Prova a formattarlo in modo più semplice.',
          details: content 
        }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build the diff result
    const matchedParsedIndices = new Set<number>();
    const matchedExistingIds = new Set<string>();
    
    const exact_matches: DiffMatch[] = [];
    const fuzzy_matches: DiffMatch[] = [];

    for (const match of aiResult.matches || []) {
      const parsed = aiResult.parsed_guests[match.parsed_index];
      const existing = existingGuestsList.find(g => g.id === match.existing_id);
      
      if (!parsed || !existing) continue;
      
      matchedParsedIndices.add(match.parsed_index);
      matchedExistingIds.add(match.existing_id);
      
      const diffMatch: DiffMatch = {
        parsed,
        existing,
        confidence: match.confidence
      };
      
      if (match.confidence >= 85) {
        exact_matches.push(diffMatch);
      } else if (match.confidence >= 50) {
        fuzzy_matches.push(diffMatch);
      }
    }

    // New entries = parsed guests without a match
    const new_entries: ParsedGuest[] = aiResult.parsed_guests.filter((_, idx) => !matchedParsedIndices.has(idx));

    // Missing in new = existing guests not matched
    const missing_in_new: ExistingGuest[] = existingGuestsList.filter(g => !matchedExistingIds.has(g.id));

    const result: DiffResult = {
      exact_matches,
      fuzzy_matches,
      new_entries,
      missing_in_new
    };

    console.log(`Diff result: ${exact_matches.length} exact, ${fuzzy_matches.length} fuzzy, ${new_entries.length} new, ${missing_in_new.length} missing`);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-guest-diff function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Errore interno del server' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
