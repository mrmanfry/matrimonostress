import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============================================================
// TYPES
// ============================================================

type VibeMode = 'CLAN' | 'BALANCED' | 'MIXER';
type AllocationMode = 'PLANNING' | 'LOGISTICS';

interface TableConfig {
  include_imperial: boolean;
  imperial_capacity: number;
  standard_shape: 'ROUND' | 'RECTANGULAR';
  capacity_range: { min: number; max: number };
  preferred_fill_rate: number;
}

interface GuestInput {
  id: string;
  first_name: string;
  last_name: string;
  party_id: string | null;
  group_id: string | null;
  category: string | null;
  rsvp_status: string | null;
}

interface Config {
  allow_split_families: boolean;
  min_fill_rate: number;
  party_categories: string[];
}

interface Payload {
  mode: AllocationMode;
  vibe_mode: VibeMode;
  guests: GuestInput[];
  table_config: TableConfig;
  config: Config;
  weddingId: string;
}

interface CreatedTable {
  id: string;
  name: string;
  capacity: number;
  table_type: string;
  shape: string;
  position_x: number;
  position_y: number;
}

interface Cluster {
  id: string;
  memberIds: string[];
  size: number;
  category: string | null;
  partyId: string | null;
  groupId: string | null;
  conflictsWith: Set<string>;
}

interface Assignment {
  tableId: string;
  guestIds: string[];
}

interface UnassignedCluster {
  clusterId: string;
  reason: string;
  guestIds: string[];
}

interface AffinityPair {
  id1: string;
  id2: string;
  score: number;
}

// ============================================================
// CONSTANTS & WEIGHT MAPS
// ============================================================

const VIBE_WEIGHTS = {
  CLAN: {
    SAME_CATEGORY: 200,
    DIFF_CATEGORY: -50,
    PARTY_CLUSTER: 0,
    SAME_PARTY: 500,
    SAME_GROUP: 300,
  },
  BALANCED: {
    SAME_CATEGORY: 50,
    DIFF_CATEGORY: 0,
    PARTY_CLUSTER: 20,
    SAME_PARTY: 500,
    SAME_GROUP: 200,
  },
  MIXER: {
    SAME_CATEGORY: 10,
    DIFF_CATEGORY: 5,
    PARTY_CLUSTER: 60,
    SAME_PARTY: 500,
    SAME_GROUP: 100,
  },
};

// ============================================================
// AI AFFINITY DETECTION
// ============================================================

async function inferAffinities(guests: GuestInput[]): Promise<AffinityPair[]> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY || guests.length < 2) return [];

  // Build a compact guest list for AI
  const guestSummary = guests.map(g => ({
    id: g.id,
    name: `${g.first_name} ${g.last_name}`,
    party: g.party_id || null,
    group: g.group_id || null,
    cat: g.category || null,
  }));

  const systemPrompt = `Sei un esperto wedding planner italiano. Analizza la lista ospiti e identifica coppie di ospiti che dovrebbero stare allo stesso tavolo.

REGOLE DI ANALISI:
1. COGNOMI CONDIVISI: Ospiti con lo stesso cognome sono probabilmente parenti → alta affinità (score 300-400)
2. STESSO NUCLEO/PARTY: Già gestito dal sistema, non ripetere
3. PATTERN GENERAZIONALI: Nomi classici (Maria, Giuseppe, Antonio) → generazione più anziana. Nomi moderni → giovani. Stessa generazione = buona affinità (score 100-200)
4. CATEGORIE SIMILI: Se presenti, rafforza l'affinità tra ospiti della stessa categoria (score 150-250)
5. NUCLEI FAMILIARI IMPLICITI: Cognomi uguali in nuclei diversi → estendere l'affinità tra i nuclei (score 200-300)

Restituisci SOLO le affinità più significative (max 30 coppie). NON includere coppie che sono già nello stesso party/nucleo.`;

  const userPrompt = `Analizza questi ${guests.length} ospiti e restituisci le affinità:

${JSON.stringify(guestSummary)}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "set_affinities",
              description: "Set guest affinity pairs for seating optimization",
              parameters: {
                type: "object",
                properties: {
                  affinity_pairs: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id1: { type: "string", description: "First guest ID" },
                        id2: { type: "string", description: "Second guest ID" },
                        score: { type: "number", description: "Affinity score 50-400" },
                        reason: { type: "string", description: "Brief reason" },
                      },
                      required: ["id1", "id2", "score"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["affinity_pairs"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "set_affinities" } },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      console.error("AI gateway error:", response.status);
      return [];
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) return [];

    const parsed = JSON.parse(toolCall.function.arguments);
    const pairs: AffinityPair[] = (parsed.affinity_pairs || [])
      .filter((p: any) => {
        // Validate: both IDs must exist in guest list
        const validIds = new Set(guests.map(g => g.id));
        return validIds.has(p.id1) && validIds.has(p.id2) && p.id1 !== p.id2;
      })
      .map((p: any) => ({
        id1: p.id1,
        id2: p.id2,
        score: Math.min(400, Math.max(50, Number(p.score) || 100)),
      }));

    console.log(`AI inferred ${pairs.length} affinity pairs`);
    return pairs;
  } catch (error) {
    console.error("AI affinity inference failed (non-blocking):", error);
    return [];
  }
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function createClusters(guests: GuestInput[]): Cluster[] {
  const partyMap = new Map<string, GuestInput[]>();
  const singles: GuestInput[] = [];

  for (const guest of guests) {
    if (guest.party_id) {
      const existing = partyMap.get(guest.party_id) || [];
      existing.push(guest);
      partyMap.set(guest.party_id, existing);
    } else {
      singles.push(guest);
    }
  }

  const clusters: Cluster[] = [];

  partyMap.forEach((partyGuests, partyId) => {
    clusters.push({
      id: `party-${partyId}`,
      memberIds: partyGuests.map(g => g.id),
      size: partyGuests.length,
      category: partyGuests[0]?.category || null,
      partyId,
      groupId: partyGuests[0]?.group_id || null,
      conflictsWith: new Set(),
    });
  });

  for (const single of singles) {
    clusters.push({
      id: `single-${single.id}`,
      memberIds: [single.id],
      size: 1,
      category: single.category,
      partyId: null,
      groupId: single.group_id,
      conflictsWith: new Set(),
    });
  }

  return clusters;
}

interface TableSpec {
  capacity: number;
  count: number;
  isImperial?: boolean;
}

function calculateOptimalTables(
  guestCount: number,
  tableConfig: TableConfig
): TableSpec[] {
  const result: TableSpec[] = [];
  let remainingGuests = guestCount;

  if (tableConfig.include_imperial) {
    result.push({ capacity: tableConfig.imperial_capacity, count: 1, isImperial: true });
    remainingGuests = Math.max(0, remainingGuests - tableConfig.imperial_capacity);
  }

  if (remainingGuests <= 0) return result;

  const { min, max } = tableConfig.capacity_range;
  const avgCapacity = Math.round((min + max) / 2);
  
  const numTables = Math.ceil(remainingGuests / avgCapacity);
  
  const baseCapacity = Math.floor(remainingGuests / numTables);
  const extraGuests = remainingGuests % numTables;
  
  const clampedBase = Math.max(min, Math.min(max, baseCapacity));
  const clampedExtra = Math.max(min, Math.min(max, baseCapacity + 1));
  
  if (extraGuests > 0 && clampedExtra !== clampedBase) {
    result.push({ capacity: clampedExtra, count: extraGuests, isImperial: false });
  }
  
  const remainingTables = numTables - extraGuests;
  if (remainingTables > 0) {
    result.push({ capacity: clampedBase, count: remainingTables, isImperial: false });
  }

  return result;
}

function generateTablePositions(count: number, startIndex: number, isImperial: boolean): { x: number; y: number }[] {
  const positions: { x: number; y: number }[] = [];
  
  if (isImperial) {
    positions.push({ x: 400, y: 50 });
    return positions;
  }

  const cols = 4;
  const spacingX = 200;
  const spacingY = 180;
  const startY = 250;

  for (let i = 0; i < count; i++) {
    const row = Math.floor((startIndex + i) / cols);
    const col = (startIndex + i) % cols;
    positions.push({
      x: 50 + col * spacingX,
      y: startY + row * spacingY,
    });
  }

  return positions;
}

function getFreeSeats(table: CreatedTable, assignments: Map<string, string[]>): number {
  const assigned = assignments.get(table.id) || [];
  return table.capacity - assigned.length;
}

function isPartyCategory(category: string | null, partyCategories: string[]): boolean {
  if (!category) return false;
  const partyCategoriesSet = new Set(partyCategories.map(c => c.toLowerCase()));
  return partyCategoriesSet.has(category.toLowerCase());
}

function calculateDynamicAffinity(
  table: CreatedTable,
  cluster: Cluster,
  allGuests: GuestInput[],
  weights: typeof VIBE_WEIGHTS['BALANCED'],
  config: Config,
  assignments: Map<string, string[]>,
  conflicts: Map<string, Set<string>>,
  vibeMode: VibeMode,
  aiAffinities: Map<string, number>
): number {
  const assignedGuestIds = assignments.get(table.id) || [];

  // HARD CONSTRAINT: Check for explicit conflicts
  for (const memberId of cluster.memberIds) {
    const memberConflicts = conflicts.get(memberId);
    if (memberConflicts) {
      for (const assignedId of assignedGuestIds) {
        if (memberConflicts.has(assignedId)) {
          return -10000;
        }
      }
    }
  }

  // Imperial table preference for certain categories
  if (table.table_type === 'imperial') {
    const isVIP = cluster.category?.toLowerCase().includes('testimon') ||
                  cluster.category?.toLowerCase().includes('genitor') ||
                  cluster.category?.toLowerCase().includes('famil');
    if (isVIP) return 1000;
    return -100;
  }

  // Empty table case - INTELLIGENT CATEGORY SEEDING
  if (assignedGuestIds.length === 0) {
    let baseScore = 10;
    
    if (table.capacity === cluster.size) {
      baseScore += 50;
    } else if (table.capacity >= cluster.size && table.capacity - cluster.size <= 2) {
      baseScore += 30;
    }
    
    if (vibeMode === 'CLAN') {
      const cat = cluster.category?.toLowerCase() || '';
      if (cluster.size >= 4) baseScore += 40;
      if (cluster.size >= 6) baseScore += 20;
      
      if (cat.includes('famil') || cat.includes('genitor')) {
        baseScore += 30;
      } else if (cat.includes('amici')) {
        baseScore += 25;
      } else if (cat.includes('colleg')) {
        baseScore += 20;
      }
    }
    
    if (vibeMode === 'MIXER' && isPartyCategory(cluster.category, config.party_categories)) {
      baseScore += 30;
    }
    
    return baseScore;
  }

  // Table with existing guests
  let score = 0;
  let sameCategoryCount = 0;
  const tableGuests = allGuests.filter(g => assignedGuestIds.includes(g.id));

  for (const seatedGuest of tableGuests) {
    if (seatedGuest.category === cluster.category && cluster.category) {
      score += weights.SAME_CATEGORY;
      sameCategoryCount++;
    } else {
      score += weights.DIFF_CATEGORY;
    }

    if (seatedGuest.party_id === cluster.partyId && cluster.partyId) {
      score += weights.SAME_PARTY;
    }

    if (seatedGuest.group_id === cluster.groupId && cluster.groupId) {
      score += weights.SAME_GROUP;
    }

    if (
      isPartyCategory(seatedGuest.category, config.party_categories) &&
      isPartyCategory(cluster.category, config.party_categories)
    ) {
      score += weights.PARTY_CLUSTER;
    }
  }

  // AI AFFINITY BOOST: add scores from AI-inferred affinities
  for (const memberId of cluster.memberIds) {
    for (const assignedId of assignedGuestIds) {
      const key1 = `${memberId}:${assignedId}`;
      const key2 = `${assignedId}:${memberId}`;
      const affinityScore = aiAffinities.get(key1) || aiAffinities.get(key2) || 0;
      score += affinityScore;
    }
  }

  if (vibeMode === 'CLAN' && sameCategoryCount === 0 && tableGuests.length > 0) {
    score -= 50;
  }

  return score;
}

// ============================================================
// MAIN ALGORITHM
// ============================================================

function runSmartTablePlanner(
  guests: GuestInput[],
  tables: CreatedTable[],
  config: Config,
  vibeMode: VibeMode,
  conflictsData: { guest_id_1: string; guest_id_2: string }[],
  aiAffinityPairs: AffinityPair[]
): { assignments: Assignment[]; unassigned: UnassignedCluster[] } {
  const weights = VIBE_WEIGHTS[vibeMode];

  // Build conflicts map
  const conflicts = new Map<string, Set<string>>();
  for (const c of conflictsData) {
    if (!conflicts.has(c.guest_id_1)) conflicts.set(c.guest_id_1, new Set());
    if (!conflicts.has(c.guest_id_2)) conflicts.set(c.guest_id_2, new Set());
    conflicts.get(c.guest_id_1)!.add(c.guest_id_2);
    conflicts.get(c.guest_id_2)!.add(c.guest_id_1);
  }

  // Build AI affinity map
  const aiAffinities = new Map<string, number>();
  for (const pair of aiAffinityPairs) {
    aiAffinities.set(`${pair.id1}:${pair.id2}`, pair.score);
    aiAffinities.set(`${pair.id2}:${pair.id1}`, pair.score);
  }

  // Group guests into clusters
  const clusters = createClusters(guests);

  // Strategic sorting: prioritize guests with high AI affinities and conflicts
  clusters.sort((a, b) => {
    const aConflicts = a.memberIds.filter(id => conflicts.has(id)).length;
    const bConflicts = b.memberIds.filter(id => conflicts.has(id)).length;
    
    if (aConflicts !== bConflicts) return bConflicts - aConflicts;
    
    // Boost clusters that have AI affinities (keep families with strong ties together early)
    const aAffinityScore = a.memberIds.reduce((sum, id) => {
      let maxAff = 0;
      aiAffinities.forEach((score, key) => {
        if (key.startsWith(id + ':')) maxAff = Math.max(maxAff, score);
      });
      return sum + maxAff;
    }, 0);
    const bAffinityScore = b.memberIds.reduce((sum, id) => {
      let maxAff = 0;
      aiAffinities.forEach((score, key) => {
        if (key.startsWith(id + ':')) maxAff = Math.max(maxAff, score);
      });
      return sum + maxAff;
    }, 0);
    
    if (aAffinityScore !== bAffinityScore) return bAffinityScore - aAffinityScore;
    
    return b.size - a.size;
  });

  const assignmentMap = new Map<string, string[]>();
  const unassigned: UnassignedCluster[] = [];
  
  for (const table of tables) {
    assignmentMap.set(table.id, []);
  }

  // Allocation loop
  for (const cluster of clusters) {
    let bestMatch: { tableId: string; score: number } | null = null;
    let highestScore = -Infinity;

    for (const table of tables) {
      const freeSeats = getFreeSeats(table, assignmentMap);
      if (freeSeats < cluster.size) continue;

      const score = calculateDynamicAffinity(
        table,
        cluster,
        guests,
        weights,
        config,
        assignmentMap,
        conflicts,
        vibeMode,
        aiAffinities
      );

      if (score > highestScore) {
        highestScore = score;
        bestMatch = { tableId: table.id, score };
      }
    }

    if (bestMatch && bestMatch.score > -500) {
      const currentAssigned = assignmentMap.get(bestMatch.tableId) || [];
      assignmentMap.set(bestMatch.tableId, [...currentAssigned, ...cluster.memberIds]);
    } else {
      unassigned.push({
        clusterId: cluster.id,
        reason: highestScore <= -500 ? 'CONFLICT' : 'NO_CAPACITY',
        guestIds: cluster.memberIds,
      });
    }
  }

  // Second pass for unassigned
  const stillUnassigned: UnassignedCluster[] = [];
  
  for (const unassignedCluster of unassigned) {
    if (unassignedCluster.reason === 'CONFLICT') {
      stillUnassigned.push(unassignedCluster);
      continue;
    }

    let bestMatch: { tableId: string; freeSeats: number } | null = null;
    let maxFreeSeats = 0;

    for (const table of tables) {
      const freeSeats = getFreeSeats(table, assignmentMap);
      if (freeSeats >= unassignedCluster.guestIds.length && freeSeats > maxFreeSeats) {
        let hasConflict = false;
        const assignedIds = assignmentMap.get(table.id) || [];
        
        for (const memberId of unassignedCluster.guestIds) {
          const memberConflicts = conflicts.get(memberId);
          if (memberConflicts) {
            for (const assignedId of assignedIds) {
              if (memberConflicts.has(assignedId)) {
                hasConflict = true;
                break;
              }
            }
          }
          if (hasConflict) break;
        }

        if (!hasConflict) {
          maxFreeSeats = freeSeats;
          bestMatch = { tableId: table.id, freeSeats };
        }
      }
    }

    if (bestMatch) {
      const currentAssigned = assignmentMap.get(bestMatch.tableId) || [];
      assignmentMap.set(bestMatch.tableId, [...currentAssigned, ...unassignedCluster.guestIds]);
    } else {
      stillUnassigned.push(unassignedCluster);
    }
  }

  // Build final assignments
  const assignments: Assignment[] = [];
  assignmentMap.forEach((guestIds, tableId) => {
    if (guestIds.length > 0) {
      assignments.push({ tableId, guestIds });
    }
  });

  return { assignments, unassigned: stillUnassigned };
}

// ============================================================
// EDGE FUNCTION HANDLER
// ============================================================

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Validate Authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.error("Missing or invalid Authorization header");
      return new Response(
        JSON.stringify({ error: "Unauthorized - missing auth token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    // 3. Verify user
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      console.error("Invalid or expired token:", userError?.message);
      return new Response(
        JSON.stringify({ error: "Unauthorized - invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Parse request
    const payload: Payload = await req.json();
    const { 
      mode, 
      vibe_mode, 
      guests, 
      table_config,
      config, 
      weddingId 
    } = payload;

    if (!weddingId) {
      return new Response(
        JSON.stringify({ error: "weddingId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 5. Verify wedding access
    const { data: weddingAccess, error: accessError } = await userClient
      .from("weddings")
      .select("id")
      .eq("id", weddingId)
      .maybeSingle();

    if (accessError || !weddingAccess) {
      console.error("Wedding access denied:", accessError?.message);
      return new Response(
        JSON.stringify({ error: "Access denied to this wedding" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Smart Table Planner: user=${user.id}, wedding=${weddingId}, mode=${mode}, vibe=${vibe_mode}, guests=${guests.length}`);

    // 6. AI affinity detection (runs in parallel with table calculation)
    const [aiAffinities, tableSpecs] = await Promise.all([
      inferAffinities(guests),
      Promise.resolve(calculateOptimalTables(guests.length, table_config)),
    ]);

    console.log("Calculated table specs:", tableSpecs);
    console.log(`AI found ${aiAffinities.length} affinity pairs`);

    // 7. Delete existing tables and assignments for this wedding
    await serviceClient
      .from("table_assignments")
      .delete()
      .in("table_id", (
        await serviceClient
          .from("tables")
          .select("id")
          .eq("wedding_id", weddingId)
      ).data?.map(t => t.id) || []);

    await serviceClient
      .from("tables")
      .delete()
      .eq("wedding_id", weddingId);

    // 8. Create new tables with PROPER INCREMENTAL NAMING
    const createdTables: CreatedTable[] = [];
    let globalTableNumber = 1;

    for (const spec of tableSpecs) {
      const isImperial = spec.isImperial === true;
      
      const positions = generateTablePositions(
        spec.count, 
        isImperial ? 0 : (globalTableNumber - 1),
        isImperial
      );

      for (let i = 0; i < spec.count; i++) {
        const tableName = isImperial 
          ? "Tavolo Sposi" 
          : `Tavolo ${globalTableNumber}`;

        const { data: newTable, error: insertError } = await serviceClient
          .from("tables")
          .insert({
            wedding_id: weddingId,
            name: tableName,
            capacity: spec.capacity,
            shape: isImperial ? 'RECTANGULAR' : table_config.standard_shape.toUpperCase(),
            table_type: isImperial ? 'imperial' : 'standard',
            position_x: positions[i]?.x || 100,
            position_y: positions[i]?.y || 100,
            is_locked: false,
          })
          .select()
          .single();

        if (insertError) {
          console.error("Error creating table:", insertError);
          throw insertError;
        }

        createdTables.push({
          id: newTable.id,
          name: newTable.name,
          capacity: newTable.capacity,
          table_type: newTable.table_type || 'standard',
          shape: newTable.shape || 'round',
          position_x: newTable.position_x,
          position_y: newTable.position_y,
        });

        if (!isImperial) {
          globalTableNumber++;
        }
      }
    }

    console.log(`Created ${createdTables.length} tables`);

    // 9. Fetch conflicts
    const { data: conflictsData, error: conflictsError } = await serviceClient
      .from("guest_conflicts")
      .select("guest_id_1, guest_id_2")
      .eq("wedding_id", weddingId);

    if (conflictsError) {
      console.error("Error fetching conflicts:", conflictsError.message);
    }

    // 10. Run assignment algorithm WITH AI affinities
    const result = runSmartTablePlanner(
      guests,
      createdTables,
      config || { allow_split_families: false, min_fill_rate: 0.8, party_categories: [] },
      vibe_mode || 'BALANCED',
      conflictsData || [],
      aiAffinities
    );

    console.log(`Algorithm result: ${result.assignments.length} assignments, ${result.unassigned.length} unassigned`);

    // 11. Save assignments to database
    for (const assignment of result.assignments) {
      for (const guestId of assignment.guestIds) {
        const { error: assignError } = await serviceClient
          .from("table_assignments")
          .insert({
            table_id: assignment.tableId,
            guest_id: guestId,
          });

        if (assignError) {
          console.error("Error saving assignment:", assignError);
        }
      }
    }

    return new Response(
      JSON.stringify({
        ...result,
        created_tables: createdTables,
        ai_affinities_count: aiAffinities.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in smart-table-assigner:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
