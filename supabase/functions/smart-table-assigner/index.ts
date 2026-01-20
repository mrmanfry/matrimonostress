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

interface TableInput {
  id: string;
  type: 'ROUND' | 'RECTANGULAR';
  capacity: number;
  is_locked: boolean;
  current_guests: string[];
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
  available_tables: TableInput[];
  guests: GuestInput[];
  config: Config;
  weddingId: string;
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
// HELPER FUNCTIONS
// ============================================================

function createClusters(guests: GuestInput[]): Cluster[] {
  const partyMap = new Map<string, GuestInput[]>();
  const singles: GuestInput[] = [];

  // Group by party_id first
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

  // Create clusters from parties
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

  // Create single-person clusters
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

function getFreeSeats(table: TableInput, assignments: Map<string, string[]>): number {
  const assigned = assignments.get(table.id) || [];
  return table.capacity - assigned.length - table.current_guests.length;
}

function isPartyCategory(category: string | null, partyCategories: string[]): boolean {
  if (!category) return false;
  const partyCategoriesSet = new Set(partyCategories.map(c => c.toLowerCase()));
  return partyCategoriesSet.has(category.toLowerCase());
}

function calculateDynamicAffinity(
  table: TableInput,
  cluster: Cluster,
  allGuests: GuestInput[],
  weights: typeof VIBE_WEIGHTS['BALANCED'],
  config: Config,
  assignments: Map<string, string[]>,
  conflicts: Map<string, Set<string>>,
  vibeMode: VibeMode
): number {
  const assignedGuestIds = [
    ...(assignments.get(table.id) || []),
    ...table.current_guests
  ];

  // HARD CONSTRAINT: Check for explicit conflicts
  for (const memberId of cluster.memberIds) {
    const memberConflicts = conflicts.get(memberId);
    if (memberConflicts) {
      for (const assignedId of assignedGuestIds) {
        if (memberConflicts.has(assignedId)) {
          return -10000; // Hard conflict penalty
        }
      }
    }
  }

  // Empty table case
  if (assignedGuestIds.length === 0) {
    // Perfect fit bonus
    if (table.capacity === cluster.size) return 60;
    
    // Party table seeding in MIXER mode
    if (vibeMode === 'MIXER' && isPartyCategory(cluster.category, config.party_categories)) {
      return 30;
    }
    return 10;
  }

  // Table with existing guests
  let score = 0;
  let sameCategoryCount = 0;
  const tableGuests = allGuests.filter(g => assignedGuestIds.includes(g.id));

  for (const seatedGuest of tableGuests) {
    // 1. Category affinity
    if (seatedGuest.category === cluster.category && cluster.category) {
      score += weights.SAME_CATEGORY;
      sameCategoryCount++;
    } else {
      score += weights.DIFF_CATEGORY;
    }

    // 2. Same party (should be rare, but highly rewarded)
    if (seatedGuest.party_id === cluster.partyId && cluster.partyId) {
      score += weights.SAME_PARTY;
    }

    // 3. Same group
    if (seatedGuest.group_id === cluster.groupId && cluster.groupId) {
      score += weights.SAME_GROUP;
    }

    // 4. Party/young people affinity
    if (
      isPartyCategory(seatedGuest.category, config.party_categories) &&
      isPartyCategory(cluster.category, config.party_categories)
    ) {
      score += weights.PARTY_CLUSTER;
    }
  }

  // Penalty for mixed categories in CLAN mode
  if (vibeMode === 'CLAN' && sameCategoryCount === 0 && tableGuests.length > 0) {
    score -= 50;
  }

  return score;
}

// ============================================================
// MAIN ALGORITHM
// ============================================================

function runSmartTableAssigner(
  tables: TableInput[],
  guests: GuestInput[],
  config: Config,
  vibeMode: VibeMode,
  conflictsData: { guest_id_1: string; guest_id_2: string }[]
): { assignments: Assignment[]; unassigned: UnassignedCluster[] } {
  // 1. Initialize weights based on vibe
  const weights = VIBE_WEIGHTS[vibeMode];

  // 2. Build conflicts map
  const conflicts = new Map<string, Set<string>>();
  for (const c of conflictsData) {
    if (!conflicts.has(c.guest_id_1)) conflicts.set(c.guest_id_1, new Set());
    if (!conflicts.has(c.guest_id_2)) conflicts.set(c.guest_id_2, new Set());
    conflicts.get(c.guest_id_1)!.add(c.guest_id_2);
    conflicts.get(c.guest_id_2)!.add(c.guest_id_1);
  }

  // 3. Group guests into clusters
  const clusters = createClusters(guests);

  // 4. Strategic sorting
  // Priority: conflicts > cluster size > party people (in MIXER mode)
  clusters.sort((a, b) => {
    const aConflicts = a.memberIds.filter(id => conflicts.has(id)).length;
    const bConflicts = b.memberIds.filter(id => conflicts.has(id)).length;
    
    if (aConflicts !== bConflicts) return bConflicts - aConflicts;
    return b.size - a.size;
  });

  const assignmentMap = new Map<string, string[]>();
  const unassigned: UnassignedCluster[] = [];
  
  // Initialize assignment map with locked tables
  for (const table of tables) {
    assignmentMap.set(table.id, []);
  }

  // 5. Allocation loop
  for (const cluster of clusters) {
    let bestMatch: { tableId: string; score: number } | null = null;
    let highestScore = -Infinity;

    for (const table of tables) {
      if (table.is_locked) continue;
      
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
        vibeMode
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

  // 6. Second pass: try to fit unassigned with relaxed constraints
  const stillUnassigned: UnassignedCluster[] = [];
  
  for (const unassignedCluster of unassigned) {
    if (unassignedCluster.reason === 'CONFLICT') {
      stillUnassigned.push(unassignedCluster);
      continue;
    }

    let bestMatch: { tableId: string; freeSeats: number } | null = null;
    let maxFreeSeats = 0;

    for (const table of tables) {
      if (table.is_locked) continue;
      
      const freeSeats = getFreeSeats(table, assignmentMap);
      if (freeSeats >= unassignedCluster.guestIds.length && freeSeats > maxFreeSeats) {
        // Check hard conflicts only
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

  // 7. Build final assignments array
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
    // 1. Validate Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.error("Missing or invalid Authorization header");
      return new Response(
        JSON.stringify({ error: "Unauthorized - missing auth token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Create Supabase client with user's token
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // 3. Verify user authentication
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      console.error("Invalid or expired token:", userError?.message);
      return new Response(
        JSON.stringify({ error: "Unauthorized - invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Parse request body
    const payload: Payload = await req.json();
    const { 
      mode, 
      vibe_mode, 
      available_tables, 
      guests, 
      config, 
      weddingId 
    } = payload;

    if (!weddingId) {
      return new Response(
        JSON.stringify({ error: "weddingId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 5. Verify user has access to this wedding
    const { data: weddingAccess, error: accessError } = await supabaseClient
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

    // 6. Fetch conflicts for this wedding
    const { data: conflictsData, error: conflictsError } = await supabaseClient
      .from("guest_conflicts")
      .select("guest_id_1, guest_id_2")
      .eq("wedding_id", weddingId);

    if (conflictsError) {
      console.error("Error fetching conflicts:", conflictsError.message);
    }

    console.log(`Smart Table Assigner: user=${user.id}, wedding=${weddingId}, mode=${mode}, vibe=${vibe_mode}, guests=${guests.length}, tables=${available_tables.length}`);

    // 7. Run the algorithm
    const result = runSmartTableAssigner(
      available_tables,
      guests,
      config || { allow_split_families: false, min_fill_rate: 0.8, party_categories: [] },
      vibe_mode || 'BALANCED',
      conflictsData || []
    );

    console.log(`Algorithm result: ${result.assignments.length} table assignments, ${result.unassigned.length} unassigned clusters`);

    return new Response(
      JSON.stringify(result),
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
