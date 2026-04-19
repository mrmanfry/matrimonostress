// ============================================================
// SMART TABLE ASSIGNER v2.0
// Pipeline: Seeding → Greedy Filling → Simulated Annealing
// ============================================================
//
// MIGLIORAMENTI vs v1:
// 1. Pipeline a 3 fasi invece del greedy single-pass
// 2. Simulated Annealing per ottimizzazione globale
// 3. Vibe Mode funzionali veri (CLAN/BALANCED/MIXER differenziati)
// 4. Rispetto dei tavoli lockati (non distrugge lavoro manuale)
// 5. calculation_mode con comportamenti differenti
// 6. Cache AI affinities (non blocca il planning se fallisce)
// 7. Unassigned actionable con suggerimenti concreti
// 8. Score qualitativo della disposizione (0-100)
// ============================================================

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

// ============================================================
// TYPES
// ============================================================

type VibeMode = "CLAN" | "BALANCED" | "MIXER";
type CalculationMode = "planned" | "expected" | "confirmed";

interface GuestInput {
  id: string;
  first_name: string;
  last_name: string;
  party_id: string | null;
  group_id: string | null;
  category: string | null;
  rsvp_status: string | null;
  is_child?: boolean;
  is_vip?: boolean;
}

interface Cluster {
  id: string;
  memberIds: string[];
  size: number;
  category: string | null;
  partyId: string | null;
  groupId: string | null;
  hasChildren: boolean;
  hasVIP: boolean;
}

interface CreatedTable {
  id: string;
  name: string;
  capacity: number;
  table_type: string;
  shape: string;
  position_x: number;
  position_y: number;
  is_locked?: boolean;
}

interface TableConfig {
  include_imperial: boolean;
  imperial_capacity: number;
  standard_shape: string;
  capacity_range: { min: number; max: number };
  preferred_fill_rate: number;
}

interface Config {
  allow_split_families: boolean;
  min_fill_rate: number;
  party_categories: string[];
}

interface AffinityPair {
  id1: string;
  id2: string;
  score: number;
}

interface Assignment {
  tableId: string;
  guestIds: string[];
}

interface UnassignedSuggestion {
  type: "CREATE_TABLE" | "REMOVE_CONFLICT" | "MOVE_GUEST" | "ALLOW_SPLIT";
  label: string;
  payload: Record<string, unknown>;
}

interface UnassignedCluster {
  clusterId: string;
  reason: "CONFLICT" | "NO_CAPACITY" | "SPLIT_REQUIRED";
  guestIds: string[];
  suggestions: UnassignedSuggestion[];
}

// ============================================================
// VIBE WEIGHTS — veramente differenziati per comportamento
// ============================================================

const VIBE_WEIGHTS = {
  CLAN: {
    SAME_CATEGORY: 200,
    DIFF_CATEGORY: -80,
    SAME_PARTY: 400,
    SAME_GROUP: 150,
    PARTY_CLUSTER: 30,
    FAMILY_UNITY_BONUS: 300, // forte bonus per tenere famiglie intere
    MIX_PENALTY: 100, // penalità se tavolo ha >2 categorie diverse
  },
  BALANCED: {
    SAME_CATEGORY: 100,
    DIFF_CATEGORY: 20,
    SAME_PARTY: 250,
    SAME_GROUP: 120,
    PARTY_CLUSTER: 80,
    FAMILY_UNITY_BONUS: 150,
    MIX_PENALTY: 30,
  },
  MIXER: {
    SAME_CATEGORY: 40,
    DIFF_CATEGORY: 80, // premia la diversità
    SAME_PARTY: 200, // comunque tieni le coppie insieme
    SAME_GROUP: 50,
    PARTY_CLUSTER: 150, // forte boost ai giovani insieme
    FAMILY_UNITY_BONUS: 80,
    MIX_PENALTY: -50, // premio per avere mix (negativo = bonus)
  },
} as const;

type Weights = typeof VIBE_WEIGHTS[VibeMode];

// ============================================================
// CLUSTER CREATION
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
      memberIds: partyGuests.map((g) => g.id),
      size: partyGuests.length,
      category: partyGuests[0]?.category || null,
      partyId,
      groupId: partyGuests[0]?.group_id || null,
      hasChildren: partyGuests.some((g) => g.is_child),
      hasVIP: partyGuests.some((g) => g.is_vip),
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
      hasChildren: single.is_child || false,
      hasVIP: single.is_vip || false,
    });
  }

  return clusters;
}

// ============================================================
// SCORING — cuore della valutazione di una disposizione
// ============================================================

/**
 * Calcola lo score di un singolo tavolo dato l'insieme di ospiti seduti.
 * Più alto = meglio. Usato sia durante l'assegnazione greedy che nell'SA.
 */
function scoreTable(
  tableGuests: GuestInput[],
  weights: Weights,
  partyCategories: Set<string>,
  aiAffinities: Map<string, number>,
  conflicts: Map<string, Set<string>>,
  vibeMode: VibeMode,
): number {
  if (tableGuests.length === 0) return 0;

  let score = 0;
  const categories = new Set<string>();
  const parties = new Set<string>();

  // Conflitti: HARD CONSTRAINT, molto negativo ma non infinito
  // (così l'SA può ancora "sentire" la differenza tra 1 e 2 conflitti)
  for (let i = 0; i < tableGuests.length; i++) {
    const g1 = tableGuests[i];
    const g1Conflicts = conflicts.get(g1.id);
    if (!g1Conflicts) continue;
    for (let j = i + 1; j < tableGuests.length; j++) {
      if (g1Conflicts.has(tableGuests[j].id)) {
        score -= 5000; // penalità forte ma misurabile
      }
    }
  }

  // Affinità pairwise
  for (let i = 0; i < tableGuests.length; i++) {
    const g1 = tableGuests[i];
    if (g1.category) categories.add(g1.category);
    if (g1.party_id) parties.add(g1.party_id);

    for (let j = i + 1; j < tableGuests.length; j++) {
      const g2 = tableGuests[j];

      // Category match
      if (g1.category && g2.category && g1.category === g2.category) {
        score += weights.SAME_CATEGORY;
      } else if (g1.category && g2.category) {
        score += weights.DIFF_CATEGORY;
      }

      // Party match (nucleo familiare)
      if (g1.party_id && g2.party_id && g1.party_id === g2.party_id) {
        score += weights.SAME_PARTY;
      }

      // Group match
      if (g1.group_id && g2.group_id && g1.group_id === g2.group_id) {
        score += weights.SAME_GROUP;
      }

      // Party category boost (es. giovani insieme)
      if (
        g1.category &&
        g2.category &&
        partyCategories.has(g1.category.toLowerCase()) &&
        partyCategories.has(g2.category.toLowerCase())
      ) {
        score += weights.PARTY_CLUSTER;
      }

      // AI affinity
      const key1 = `${g1.id}:${g2.id}`;
      const key2 = `${g2.id}:${g1.id}`;
      const affinityScore = aiAffinities.get(key1) || aiAffinities.get(key2) || 0;
      score += affinityScore;
    }
  }

  // Penalità/bonus per diversità di categorie
  if (categories.size >= 3) {
    score -= weights.MIX_PENALTY * (categories.size - 2);
  }

  // CLAN bonus: se tutto il tavolo è un unico party
  if (vibeMode === "CLAN" && parties.size === 1 && tableGuests.length >= 3) {
    score += weights.FAMILY_UNITY_BONUS;
  }

  // MIXER: bonus extra se ci sono almeno 3 categorie diverse
  if (vibeMode === "MIXER" && categories.size >= 3) {
    score += 200;
  }

  // Bonus per tavolo pieno (usa bene la capacità)
  // Non dipende dalla capacità qui, lo aggiungiamo nel global score

  return score;
}

/**
 * Score globale di tutta la disposizione.
 * Usato dall'SA per decidere se accettare uno swap.
 */
function scoreArrangement(
  assignments: Map<string, string[]>,
  tables: CreatedTable[],
  guestsById: Map<string, GuestInput>,
  weights: Weights,
  partyCategories: Set<string>,
  aiAffinities: Map<string, number>,
  conflicts: Map<string, Set<string>>,
  vibeMode: VibeMode,
): number {
  let total = 0;

  for (const table of tables) {
    const guestIds = assignments.get(table.id) || [];
    const tableGuests = guestIds
      .map((id) => guestsById.get(id))
      .filter((g): g is GuestInput => g !== undefined);

    total += scoreTable(
      tableGuests,
      weights,
      partyCategories,
      aiAffinities,
      conflicts,
      vibeMode,
    );

    // Bonus fill-rate: premia tavoli pieni ~90%
    const fillRate = guestIds.length / table.capacity;
    if (fillRate >= 0.8 && fillRate <= 1.0) {
      total += 50 * tableGuests.length;
    } else if (fillRate < 0.5 && guestIds.length > 0) {
      total -= 100; // tavolo troppo vuoto = triste
    }
  }

  return total;
}

// ============================================================
// PHASE 1: STRATEGIC SEEDING
// Pre-assegna i "seeds" per dare identità ai tavoli
// ============================================================

function seedTables(
  clusters: Cluster[],
  tables: CreatedTable[],
  guestsById: Map<string, GuestInput>,
  vibeMode: VibeMode,
  conflicts: Map<string, Set<string>>,
): { seededAssignments: Map<string, string[]>; remainingClusters: Cluster[] } {
  const assignments = new Map<string, string[]>();
  for (const t of tables) assignments.set(t.id, []);

  // Tavoli disponibili per seeding (escludi imperial e lockati)
  const seedableTables = tables.filter(
    (t) => t.table_type !== "imperial" && !t.is_locked,
  );

  if (seedableTables.length === 0) {
    return { seededAssignments: assignments, remainingClusters: clusters };
  }

  // Clusters disponibili (escludi VIP che vanno all'imperial)
  const nonVIPClusters = clusters.filter((c) => !c.hasVIP);

  // Strategia di seeding per Vibe
  let seeds: Cluster[] = [];

  if (vibeMode === "CLAN") {
    // CLAN: seed = i cluster più grandi, uno per tavolo, raggruppati per categoria
    const sorted = [...nonVIPClusters].sort((a, b) => b.size - a.size);
    seeds = sorted.slice(0, seedableTables.length);
  } else if (vibeMode === "MIXER") {
    // MIXER: seed = cluster diversi per categoria, max 1 seed per categoria per partire
    const byCategory = new Map<string, Cluster[]>();
    for (const c of nonVIPClusters) {
      const cat = c.category || "_none_";
      if (!byCategory.has(cat)) byCategory.set(cat, []);
      byCategory.get(cat)!.push(c);
    }
    // Ordina ogni categoria per size desc, poi prendi round-robin
    for (const [, arr] of byCategory) {
      arr.sort((a, b) => b.size - a.size);
    }
    const categories = Array.from(byCategory.keys());
    let idx = 0;
    while (seeds.length < seedableTables.length && categories.length > 0) {
      const cat = categories[idx % categories.length];
      const arr = byCategory.get(cat)!;
      if (arr.length > 0) {
        seeds.push(arr.shift()!);
      } else {
        categories.splice(idx % categories.length, 1);
        if (categories.length === 0) break;
        continue;
      }
      idx++;
    }
  } else {
    // BALANCED: mix — cluster grandi prima, poi diversificando categoria
    const sorted = [...nonVIPClusters].sort((a, b) => {
      if (a.size !== b.size) return b.size - a.size;
      return 0;
    });
    const usedCategories = new Set<string>();
    for (const c of sorted) {
      if (seeds.length >= seedableTables.length) break;
      if (c.size >= 2 || !usedCategories.has(c.category || "_none_")) {
        seeds.push(c);
        if (c.category) usedCategories.add(c.category);
      }
    }
    // Fill con rimanenti se servono
    for (const c of sorted) {
      if (seeds.length >= seedableTables.length) break;
      if (!seeds.includes(c)) seeds.push(c);
    }
  }

  // Assegna ogni seed al tavolo con capacità più adatta
  const usedClusterIds = new Set<string>();
  const availableTables = [...seedableTables];

  for (const seed of seeds) {
    if (seed.size === 0) continue;
    // Trova il tavolo con capacità ≥ seed.size e più vicina
    availableTables.sort((a, b) => {
      const diffA = a.capacity - seed.size;
      const diffB = b.capacity - seed.size;
      if (diffA < 0 && diffB < 0) return diffB - diffA;
      if (diffA < 0) return 1;
      if (diffB < 0) return -1;
      return diffA - diffB;
    });

    const targetTable = availableTables[0];
    if (!targetTable || targetTable.capacity < seed.size) continue;

    assignments.set(targetTable.id, [...seed.memberIds]);
    usedClusterIds.add(seed.id);
    availableTables.shift();
  }

  const remaining = clusters.filter((c) => !usedClusterIds.has(c.id));
  return { seededAssignments: assignments, remainingClusters: remaining };
}

// ============================================================
// PHASE 2: GREEDY FILLING
// Riempie i posti residui con i cluster rimanenti
// ============================================================

function greedyFill(
  assignments: Map<string, string[]>,
  clusters: Cluster[],
  tables: CreatedTable[],
  guestsById: Map<string, GuestInput>,
  weights: Weights,
  partyCategories: Set<string>,
  aiAffinities: Map<string, number>,
  conflicts: Map<string, Set<string>>,
  vibeMode: VibeMode,
  config: Config,
): { unassigned: Cluster[] } {
  const unassigned: Cluster[] = [];

  // Ordina cluster: prima VIP (per imperial), poi per size desc, poi con conflitti
  const sortedClusters = [...clusters].sort((a, b) => {
    if (a.hasVIP !== b.hasVIP) return a.hasVIP ? -1 : 1;
    const aHasConflicts = a.memberIds.some((id) => conflicts.has(id));
    const bHasConflicts = b.memberIds.some((id) => conflicts.has(id));
    if (aHasConflicts !== bHasConflicts) return aHasConflicts ? -1 : 1;
    return b.size - a.size;
  });

  for (const cluster of sortedClusters) {
    let bestTable: CreatedTable | null = null;
    let bestScore = -Infinity;

    for (const table of tables) {
      if (table.is_locked) continue;
      const currentIds = assignments.get(table.id) || [];
      const freeSeats = table.capacity - currentIds.length;
      if (freeSeats < cluster.size) continue;

      // Imperial table preference
      if (table.table_type === "imperial") {
        if (!cluster.hasVIP) continue; // solo VIP all'imperial
      } else if (cluster.hasVIP && tables.some((t) => t.table_type === "imperial" && !t.is_locked)) {
        continue; // VIP va all'imperial se esiste
      }

      // Check conflitti hard
      let hasHardConflict = false;
      for (const memberId of cluster.memberIds) {
        const memberConflicts = conflicts.get(memberId);
        if (!memberConflicts) continue;
        for (const assignedId of currentIds) {
          if (memberConflicts.has(assignedId)) {
            hasHardConflict = true;
            break;
          }
        }
        if (hasHardConflict) break;
      }
      if (hasHardConflict) continue;

      // Simula l'aggiunta e calcola delta score
      const simulatedIds = [...currentIds, ...cluster.memberIds];
      const simulatedGuests = simulatedIds
        .map((id) => guestsById.get(id))
        .filter((g): g is GuestInput => g !== undefined);

      const newScore = scoreTable(
        simulatedGuests,
        weights,
        partyCategories,
        aiAffinities,
        conflicts,
        vibeMode,
      );
      const oldGuests = currentIds
        .map((id) => guestsById.get(id))
        .filter((g): g is GuestInput => g !== undefined);
      const oldScore = scoreTable(
        oldGuests,
        weights,
        partyCategories,
        aiAffinities,
        conflicts,
        vibeMode,
      );
      const delta = newScore - oldScore;

      if (delta > bestScore) {
        bestScore = delta;
        bestTable = table;
      }
    }

    if (bestTable) {
      const currentIds = assignments.get(bestTable.id) || [];
      assignments.set(bestTable.id, [...currentIds, ...cluster.memberIds]);
    } else {
      unassigned.push(cluster);
    }
  }

  return { unassigned };
}

// ============================================================
// PHASE 3: SIMULATED ANNEALING
// Ottimizzazione globale via swap casuali con raffreddamento
// ============================================================

interface SAConfig {
  maxIterations: number;
  initialTemperature: number;
  coolingRate: number;
  timeBudgetMs: number;
}

function simulatedAnnealing(
  assignments: Map<string, string[]>,
  tables: CreatedTable[],
  guestsById: Map<string, GuestInput>,
  weights: Weights,
  partyCategories: Set<string>,
  aiAffinities: Map<string, number>,
  conflicts: Map<string, Set<string>>,
  vibeMode: VibeMode,
  clustersByGuestId: Map<string, Cluster>,
  saConfig: SAConfig,
): { finalAssignments: Map<string, string[]>; improvementPct: number } {
  const startTime = Date.now();

  // Lavoriamo su una copia
  const current = new Map<string, string[]>();
  assignments.forEach((ids, tid) => current.set(tid, [...ids]));

  let currentScore = scoreArrangement(
    current,
    tables,
    guestsById,
    weights,
    partyCategories,
    aiAffinities,
    conflicts,
    vibeMode,
  );

  const initialScore = currentScore;

  // Best seen
  const best = new Map<string, string[]>();
  current.forEach((ids, tid) => best.set(tid, [...ids]));
  let bestScore = currentScore;

  let temperature = saConfig.initialTemperature;
  const swappableTables = tables.filter((t) => !t.is_locked);

  if (swappableTables.length < 2) {
    return { finalAssignments: current, improvementPct: 0 };
  }

  let accepted = 0;
  let rejected = 0;

  for (let iter = 0; iter < saConfig.maxIterations; iter++) {
    // Time budget safety
    if (iter % 100 === 0 && Date.now() - startTime > saConfig.timeBudgetMs) {
      console.log(`SA: time budget exceeded at iteration ${iter}`);
      break;
    }

    // Pick two random tables
    const t1 = swappableTables[Math.floor(Math.random() * swappableTables.length)];
    const t2 = swappableTables[Math.floor(Math.random() * swappableTables.length)];
    if (t1.id === t2.id) continue;

    const ids1 = current.get(t1.id) || [];
    const ids2 = current.get(t2.id) || [];

    // Scegli tra swap (scambio) o move (spostamento)
    const operation = Math.random() < 0.5 ? "swap" : "move";

    if (operation === "swap") {
      if (ids1.length === 0 || ids2.length === 0) continue;

      // Pesca un guest da ogni tavolo, ma NON spezzare cluster piccoli
      // (se un cluster è interamente in un tavolo, meglio non disgregarlo)
      const g1Id = ids1[Math.floor(Math.random() * ids1.length)];
      const g2Id = ids2[Math.floor(Math.random() * ids2.length)];

      // Skip se farebbe separare un party (hard rule: party sempre uniti)
      const c1 = clustersByGuestId.get(g1Id);
      const c2 = clustersByGuestId.get(g2Id);
      if (c1 && c1.size > 1 && c1.memberIds.some((id) => ids1.includes(id) && id !== g1Id)) {
        continue; // g1 fa parte di un party nel tavolo 1, non spezzarlo
      }
      if (c2 && c2.size > 1 && c2.memberIds.some((id) => ids2.includes(id) && id !== g2Id)) {
        continue;
      }

      // Simula swap
      const newIds1 = ids1.filter((id) => id !== g1Id).concat(g2Id);
      const newIds2 = ids2.filter((id) => id !== g2Id).concat(g1Id);

      // Valuta delta
      const beforeScore =
        scoreTableById(t1, ids1, guestsById, weights, partyCategories, aiAffinities, conflicts, vibeMode) +
        scoreTableById(t2, ids2, guestsById, weights, partyCategories, aiAffinities, conflicts, vibeMode);
      const afterScore =
        scoreTableById(t1, newIds1, guestsById, weights, partyCategories, aiAffinities, conflicts, vibeMode) +
        scoreTableById(t2, newIds2, guestsById, weights, partyCategories, aiAffinities, conflicts, vibeMode);

      const delta = afterScore - beforeScore;

      // Accept?
      if (delta > 0 || Math.random() < Math.exp(delta / temperature)) {
        current.set(t1.id, newIds1);
        current.set(t2.id, newIds2);
        currentScore += delta;
        accepted++;

        if (currentScore > bestScore) {
          bestScore = currentScore;
          best.clear();
          current.forEach((ids, tid) => best.set(tid, [...ids]));
        }
      } else {
        rejected++;
      }
    } else {
      // MOVE: sposta un guest da t1 a t2 (se c'è spazio)
      if (ids1.length === 0) continue;
      if (ids2.length >= t2.capacity) continue;

      const gId = ids1[Math.floor(Math.random() * ids1.length)];
      const c = clustersByGuestId.get(gId);
      if (c && c.size > 1 && c.memberIds.some((id) => ids1.includes(id) && id !== gId)) {
        continue;
      }

      const newIds1 = ids1.filter((id) => id !== gId);
      const newIds2 = [...ids2, gId];

      const beforeScore =
        scoreTableById(t1, ids1, guestsById, weights, partyCategories, aiAffinities, conflicts, vibeMode) +
        scoreTableById(t2, ids2, guestsById, weights, partyCategories, aiAffinities, conflicts, vibeMode);
      const afterScore =
        scoreTableById(t1, newIds1, guestsById, weights, partyCategories, aiAffinities, conflicts, vibeMode) +
        scoreTableById(t2, newIds2, guestsById, weights, partyCategories, aiAffinities, conflicts, vibeMode);

      const delta = afterScore - beforeScore;

      if (delta > 0 || Math.random() < Math.exp(delta / temperature)) {
        current.set(t1.id, newIds1);
        current.set(t2.id, newIds2);
        currentScore += delta;
        accepted++;

        if (currentScore > bestScore) {
          bestScore = currentScore;
          best.clear();
          current.forEach((ids, tid) => best.set(tid, [...ids]));
        }
      } else {
        rejected++;
      }
    }

    temperature *= saConfig.coolingRate;
    if (temperature < 0.01) temperature = 0.01;
  }

  const improvementPct =
    initialScore !== 0 ? ((bestScore - initialScore) / Math.abs(initialScore)) * 100 : 0;

  console.log(
    `SA completed: initial=${initialScore.toFixed(0)}, best=${bestScore.toFixed(0)}, ` +
      `improvement=${improvementPct.toFixed(1)}%, accepted=${accepted}, rejected=${rejected}`,
  );

  return { finalAssignments: best, improvementPct };
}

// Helper: score di un singolo tavolo dato l'array di IDs
function scoreTableById(
  table: CreatedTable,
  guestIds: string[],
  guestsById: Map<string, GuestInput>,
  weights: Weights,
  partyCategories: Set<string>,
  aiAffinities: Map<string, number>,
  conflicts: Map<string, Set<string>>,
  vibeMode: VibeMode,
): number {
  const tableGuests = guestIds
    .map((id) => guestsById.get(id))
    .filter((g): g is GuestInput => g !== undefined);
  let s = scoreTable(tableGuests, weights, partyCategories, aiAffinities, conflicts, vibeMode);

  // Fill-rate bonus
  const fillRate = guestIds.length / table.capacity;
  if (fillRate >= 0.8 && fillRate <= 1.0) {
    s += 50 * tableGuests.length;
  } else if (fillRate < 0.5 && guestIds.length > 0) {
    s -= 100;
  }
  return s;
}

// ============================================================
// UNASSIGNED SUGGESTIONS
// Per ogni cluster non piazzato, genera azioni concrete
// ============================================================

function buildSuggestions(
  cluster: Cluster,
  reason: "CONFLICT" | "NO_CAPACITY" | "SPLIT_REQUIRED",
  tables: CreatedTable[],
  assignments: Map<string, string[]>,
  conflicts: Map<string, Set<string>>,
  guestsById: Map<string, GuestInput>,
  capacityRange: { min: number; max: number },
): UnassignedSuggestion[] {
  const suggestions: UnassignedSuggestion[] = [];

  // Suggerimento 1: crea un tavolo extra
  const suggestedCapacity = Math.max(
    capacityRange.min,
    Math.min(capacityRange.max, Math.ceil(cluster.size * 1.2)),
  );
  suggestions.push({
    type: "CREATE_TABLE",
    label: `Crea un tavolo extra da ${suggestedCapacity} posti per questo gruppo`,
    payload: {
      capacity: suggestedCapacity,
      assign_guest_ids: cluster.memberIds,
    },
  });

  // Suggerimento 2 (solo se CONFLICT): rimuovi il conflitto
  if (reason === "CONFLICT") {
    // Trova i conflitti specifici che bloccano l'assegnazione
    const blockingConflicts: { guestA: string; guestB: string; tableId: string }[] = [];
    for (const memberId of cluster.memberIds) {
      const memberConflicts = conflicts.get(memberId);
      if (!memberConflicts) continue;
      for (const table of tables) {
        const ids = assignments.get(table.id) || [];
        for (const assignedId of ids) {
          if (memberConflicts.has(assignedId)) {
            blockingConflicts.push({
              guestA: memberId,
              guestB: assignedId,
              tableId: table.id,
            });
          }
        }
      }
    }
    if (blockingConflicts.length > 0) {
      const first = blockingConflicts[0];
      const gA = guestsById.get(first.guestA);
      const gB = guestsById.get(first.guestB);
      if (gA && gB) {
        suggestions.push({
          type: "REMOVE_CONFLICT",
          label: `Rimuovi il conflitto tra ${gA.first_name} ${gA.last_name} e ${gB.first_name} ${gB.last_name}`,
          payload: {
            guest_id_1: first.guestA,
            guest_id_2: first.guestB,
          },
        });
      }
    }
  }

  // Suggerimento 3 (solo se cluster size > 1 e NO_CAPACITY): permetti split
  if (reason === "NO_CAPACITY" && cluster.size > 1) {
    suggestions.push({
      type: "ALLOW_SPLIT",
      label: `Dividi il gruppo in più tavoli (separa ${cluster.size} persone)`,
      payload: {
        cluster_id: cluster.id,
        guest_ids: cluster.memberIds,
      },
    });
  }

  return suggestions;
}

// ============================================================
// QUALITY SCORE — per mostrare all'utente "⭐ Eccellente"
// ============================================================

function computeQualityScore(
  assignments: Map<string, string[]>,
  tables: CreatedTable[],
  guestsById: Map<string, GuestInput>,
  conflicts: Map<string, Set<string>>,
  unassignedCount: number,
  totalGuests: number,
): { score: number; label: string; breakdown: Record<string, number> } {
  let conflictsRemaining = 0;
  let totalFillRate = 0;
  let tablesWithGuests = 0;
  let balancedTables = 0;
  let splitFamilies = 0;

  // Conta conflitti residui
  for (const [, ids] of assignments) {
    for (let i = 0; i < ids.length; i++) {
      const cc = conflicts.get(ids[i]);
      if (!cc) continue;
      for (let j = i + 1; j < ids.length; j++) {
        if (cc.has(ids[j])) conflictsRemaining++;
      }
    }
  }

  // Fill rate e balance
  for (const table of tables) {
    const ids = assignments.get(table.id) || [];
    if (ids.length === 0) continue;
    tablesWithGuests++;
    const fr = ids.length / table.capacity;
    totalFillRate += fr;
    if (fr >= 0.7 && fr <= 1.0) balancedTables++;
  }

  const avgFillRate = tablesWithGuests > 0 ? totalFillRate / tablesWithGuests : 0;

  // Conta famiglie spezzate (party diviso tra tavoli)
  const partyToTables = new Map<string, Set<string>>();
  for (const [tableId, ids] of assignments) {
    for (const gid of ids) {
      const g = guestsById.get(gid);
      if (!g || !g.party_id) continue;
      if (!partyToTables.has(g.party_id)) partyToTables.set(g.party_id, new Set());
      partyToTables.get(g.party_id)!.add(tableId);
    }
  }
  for (const [, tSet] of partyToTables) {
    if (tSet.size > 1) splitFamilies++;
  }

  // Pesi per score finale
  const assignmentRate = totalGuests > 0 ? 1 - unassignedCount / totalGuests : 1;

  // Score 0-100
  let score = 0;
  score += assignmentRate * 40; // 40% peso su "quanti sono seduti"
  score += (1 - Math.min(1, conflictsRemaining / 5)) * 25; // 25% conflitti
  score += avgFillRate * 20; // 20% fill rate
  score += (balancedTables / Math.max(1, tablesWithGuests)) * 10; // 10% balance
  score += (1 - Math.min(1, splitFamilies / 5)) * 5; // 5% unità famiglie

  score = Math.round(Math.max(0, Math.min(100, score)));

  let label = "Da rivedere";
  if (score >= 85) label = "Eccellente";
  else if (score >= 70) label = "Buona";
  else if (score >= 50) label = "Accettabile";

  return {
    score,
    label,
    breakdown: {
      assignment_rate: Math.round(assignmentRate * 100),
      conflicts_remaining: conflictsRemaining,
      avg_fill_rate: Math.round(avgFillRate * 100),
      balanced_tables: balancedTables,
      split_families: splitFamilies,
    },
  };
}

// ============================================================
// TABLE GENERATION
// ============================================================

interface TableSpec {
  capacity: number;
  count: number;
  isImperial?: boolean;
}

function calculateOptimalTables(
  guestCount: number,
  tableConfig: TableConfig,
  calculationMode: CalculationMode,
): TableSpec[] {
  const result: TableSpec[] = [];
  let remainingGuests = guestCount;

  // Planned mode: aggiungi 10% buffer no-show
  if (calculationMode === "planned") {
    remainingGuests = Math.ceil(guestCount * 0.95); // stima prudente
  }

  if (tableConfig.include_imperial) {
    result.push({
      capacity: tableConfig.imperial_capacity,
      count: 1,
      isImperial: true,
    });
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

function generateTablePositions(
  count: number,
  startIndex: number,
  isImperial: boolean,
): { x: number; y: number }[] {
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

// ============================================================
// AI AFFINITIES — ora con cache lookup
// ============================================================

async function getCachedOrInferAffinities(
  serviceClient: ReturnType<typeof createClient>,
  weddingId: string,
  guests: GuestInput[],
): Promise<AffinityPair[]> {
  // 1. Prova a leggere dalla cache (tabella ai_affinities)
  try {
    const { data: cached } = await serviceClient
      .from("ai_affinities")
      .select("guest_id_1, guest_id_2, score")
      .eq("wedding_id", weddingId);

    if (cached && cached.length > 0) {
      console.log(`Loaded ${cached.length} AI affinities from cache`);
      return cached.map((c: { guest_id_1: string; guest_id_2: string; score: number }) => ({
        id1: c.guest_id_1,
        id2: c.guest_id_2,
        score: c.score,
      }));
    }
  } catch (err) {
    console.log("Cache miss or table not present, falling back to live inference", err);
  }

  // 2. Fallback: inference live (con timeout corto per non bloccare)
  if (!LOVABLE_API_KEY || guests.length < 4) return [];

  const guestSummary = guests.map((g) => ({
    id: g.id,
    name: `${g.first_name} ${g.last_name}`,
    category: g.category,
  }));

  const systemPrompt = `Sei un assistente che analizza liste invitati matrimonio e inferisce affinità sociali.
Restituisci al massimo 30 coppie con score 50-400 basato su:
- Cognomi uguali in nuclei diversi (score 200-300)
- Pattern generazionali (nomi classici vs moderni, score 100-200)
- Stessa categoria (score 100-200)
NON includere coppie nello stesso party.`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000); // timeout ridotto

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: JSON.stringify(guestSummary) },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "set_affinities",
              parameters: {
                type: "object",
                properties: {
                  affinity_pairs: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id1: { type: "string" },
                        id2: { type: "string" },
                        score: { type: "number" },
                      },
                      required: ["id1", "id2", "score"],
                    },
                  },
                },
                required: ["affinity_pairs"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "set_affinities" } },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) return [];

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) return [];

    const parsed = JSON.parse(toolCall.function.arguments);
    const validIds = new Set(guests.map((g) => g.id));

    const pairs: AffinityPair[] = (parsed.affinity_pairs || [])
      .filter(
        (p: { id1: string; id2: string; score: number }) =>
          validIds.has(p.id1) && validIds.has(p.id2) && p.id1 !== p.id2,
      )
      .map((p: { id1: string; id2: string; score: number }) => ({
        id1: p.id1,
        id2: p.id2,
        score: Math.min(400, Math.max(50, Number(p.score) || 100)),
      }));

    // Best-effort: salva in cache (non blocca)
    try {
      await serviceClient.from("ai_affinities").insert(
        pairs.map((p) => ({
          wedding_id: weddingId,
          guest_id_1: p.id1,
          guest_id_2: p.id2,
          score: p.score,
        })),
      );
    } catch (err) {
      console.log("AI affinity cache write failed (non-blocking)", err);
    }

    return pairs;
  } catch (error) {
    console.error("AI affinity inference failed (non-blocking):", error);
    return [];
  }
}

// ============================================================
// MAIN PIPELINE
// ============================================================

function runFullPipeline(
  guests: GuestInput[],
  tables: CreatedTable[],
  config: Config,
  vibeMode: VibeMode,
  conflictsData: { guest_id_1: string; guest_id_2: string }[],
  aiAffinityPairs: AffinityPair[],
  capacityRange: { min: number; max: number },
): {
  assignments: Assignment[];
  unassigned: UnassignedCluster[];
  quality: ReturnType<typeof computeQualityScore>;
  sa_improvement_pct: number;
} {
  const weights = VIBE_WEIGHTS[vibeMode];
  const partyCategories = new Set(config.party_categories.map((c) => c.toLowerCase()));

  // Guests lookup
  const guestsById = new Map<string, GuestInput>();
  for (const g of guests) guestsById.set(g.id, g);

  // Conflitti map
  const conflicts = new Map<string, Set<string>>();
  for (const c of conflictsData) {
    if (!conflicts.has(c.guest_id_1)) conflicts.set(c.guest_id_1, new Set());
    if (!conflicts.has(c.guest_id_2)) conflicts.set(c.guest_id_2, new Set());
    conflicts.get(c.guest_id_1)!.add(c.guest_id_2);
    conflicts.get(c.guest_id_2)!.add(c.guest_id_1);
  }

  // AI affinities map
  const aiAffinities = new Map<string, number>();
  for (const pair of aiAffinityPairs) {
    aiAffinities.set(`${pair.id1}:${pair.id2}`, pair.score);
    aiAffinities.set(`${pair.id2}:${pair.id1}`, pair.score);
  }

  // Clusters
  const clusters = createClusters(guests);
  const clustersByGuestId = new Map<string, Cluster>();
  for (const c of clusters) {
    for (const id of c.memberIds) clustersByGuestId.set(id, c);
  }

  // PHASE 1: Seeding
  console.log(`Phase 1: Seeding ${tables.length} tables with ${clusters.length} clusters...`);
  const { seededAssignments, remainingClusters } = seedTables(
    clusters,
    tables,
    guestsById,
    vibeMode,
    conflicts,
  );

  // PHASE 2: Greedy Fill
  console.log(`Phase 2: Greedy filling ${remainingClusters.length} remaining clusters...`);
  const { unassigned: greedyUnassigned } = greedyFill(
    seededAssignments,
    remainingClusters,
    tables,
    guestsById,
    weights,
    partyCategories,
    aiAffinities,
    conflicts,
    vibeMode,
    config,
  );

  // PHASE 3: Simulated Annealing (solo se ≥2 tavoli non lockati)
  const swappableTables = tables.filter((t) => !t.is_locked);
  let finalAssignments = seededAssignments;
  let saImprovementPct = 0;

  if (swappableTables.length >= 2) {
    const totalGuestsAssigned = Array.from(seededAssignments.values()).reduce(
      (sum, ids) => sum + ids.length,
      0,
    );
    // Scala iterazioni in base alla dimensione
    const iterations = Math.min(10000, Math.max(1000, totalGuestsAssigned * 50));
    console.log(`Phase 3: Simulated Annealing with ${iterations} iterations...`);

    const saResult = simulatedAnnealing(
      seededAssignments,
      tables,
      guestsById,
      weights,
      partyCategories,
      aiAffinities,
      conflicts,
      vibeMode,
      clustersByGuestId,
      {
        maxIterations: iterations,
        initialTemperature: 500,
        coolingRate: 0.9995,
        timeBudgetMs: 15000, // 15s max per l'SA
      },
    );
    finalAssignments = saResult.finalAssignments;
    saImprovementPct = saResult.improvementPct;
  }

  // Build unassigned with suggestions
  const unassignedWithSuggestions: UnassignedCluster[] = greedyUnassigned.map((cluster) => {
    // Determina reason: CONFLICT se i conflitti sono la causa, altrimenti NO_CAPACITY
    let reason: "CONFLICT" | "NO_CAPACITY" | "SPLIT_REQUIRED" = "NO_CAPACITY";
    for (const memberId of cluster.memberIds) {
      if (conflicts.has(memberId)) {
        // Controlla se c'è almeno un tavolo con posto ma bloccato da conflitto
        for (const table of tables) {
          const ids = finalAssignments.get(table.id) || [];
          if (table.capacity - ids.length >= cluster.size) {
            const memberConflicts = conflicts.get(memberId);
            if (memberConflicts && ids.some((id) => memberConflicts.has(id))) {
              reason = "CONFLICT";
              break;
            }
          }
        }
      }
      if (reason === "CONFLICT") break;
    }

    const suggestions = buildSuggestions(
      cluster,
      reason,
      tables,
      finalAssignments,
      conflicts,
      guestsById,
      capacityRange,
    );

    return {
      clusterId: cluster.id,
      reason,
      guestIds: cluster.memberIds,
      suggestions,
    };
  });

  // Build final assignments array
  const assignments: Assignment[] = [];
  finalAssignments.forEach((guestIds, tableId) => {
    if (guestIds.length > 0) assignments.push({ tableId, guestIds });
  });

  // Quality score
  const totalGuests = guests.length;
  const unassignedCount = unassignedWithSuggestions.reduce(
    (sum, u) => sum + u.guestIds.length,
    0,
  );
  const quality = computeQualityScore(
    finalAssignments,
    tables,
    guestsById,
    conflicts,
    unassignedCount,
    totalGuests,
  );

  return {
    assignments,
    unassigned: unassignedWithSuggestions,
    quality,
    sa_improvement_pct: saImprovementPct,
  };
}

// ============================================================
// EDGE FUNCTION HANDLER
// ============================================================

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized - missing auth token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const {
      guests,
      weddingId,
      vibe_mode,
      config,
      table_config,
      target_guest_count,
      calculation_mode,
      preserve_locked_tables,
    } = body as {
      guests: GuestInput[];
      weddingId: string;
      vibe_mode: VibeMode;
      config: Config;
      table_config: TableConfig;
      target_guest_count: number;
      calculation_mode: CalculationMode;
      preserve_locked_tables?: boolean;
    };

    if (!weddingId || !guests || guests.length === 0) {
      return new Response(JSON.stringify({ error: "Missing weddingId or guests" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(
      `Planner start: wedding=${weddingId}, guests=${guests.length}, vibe=${vibe_mode}, mode=${calculation_mode}, preserve_locked=${preserve_locked_tables}`,
    );

    // 1. Recupera tavoli lockati esistenti (se preserve_locked_tables)
    let lockedTables: CreatedTable[] = [];
    let lockedAssignments: Map<string, string[]> = new Map();
    const lockedGuestIds = new Set<string>();

    if (preserve_locked_tables) {
      const { data: existingLocked } = await serviceClient
        .from("tables")
        .select("id, name, capacity, shape, table_type, position_x, position_y, is_locked")
        .eq("wedding_id", weddingId)
        .eq("is_locked", true);

      if (existingLocked && existingLocked.length > 0) {
        lockedTables = existingLocked as CreatedTable[];
        const lockedIds = lockedTables.map((t) => t.id);

        const { data: existingAssignments } = await serviceClient
          .from("table_assignments")
          .select("table_id, guest_id")
          .in("table_id", lockedIds);

        if (existingAssignments) {
          for (const a of existingAssignments as { table_id: string; guest_id: string }[]) {
            if (!lockedAssignments.has(a.table_id)) lockedAssignments.set(a.table_id, []);
            lockedAssignments.get(a.table_id)!.push(a.guest_id);
            lockedGuestIds.add(a.guest_id);
          }
        }
        console.log(`Preserving ${lockedTables.length} locked tables with ${lockedGuestIds.size} guests`);
      }
    }

    // 2. Elimina tavoli NON lockati e loro assegnazioni
    const { data: allTables } = await serviceClient
      .from("tables")
      .select("id, is_locked")
      .eq("wedding_id", weddingId);

    if (allTables) {
      const toDeleteIds = (allTables as { id: string; is_locked: boolean | null }[])
        .filter((t) => !t.is_locked)
        .map((t) => t.id);

      if (toDeleteIds.length > 0) {
        await serviceClient.from("table_assignments").delete().in("table_id", toDeleteIds);
        await serviceClient.from("tables").delete().in("id", toDeleteIds);
      }
    }

    // 3. Calcola posti residui necessari (esclusi già lockati)
    const guestsToAssign = guests.filter((g) => !lockedGuestIds.has(g.id));
    const lockedCapacity = lockedTables.reduce((sum, t) => sum + t.capacity, 0);
    const lockedSeatsUsed = Array.from(lockedAssignments.values()).reduce(
      (sum, ids) => sum + ids.length,
      0,
    );
    const lockedFreeSeats = lockedCapacity - lockedSeatsUsed;

    const guestsNeedingNewTables = Math.max(0, guestsToAssign.length - lockedFreeSeats);

    // 4. Genera nuovi tavoli
    const tableSpecs = calculateOptimalTables(
      guestsNeedingNewTables > 0 ? guestsNeedingNewTables : target_guest_count - lockedSeatsUsed,
      table_config,
      calculation_mode,
    );

    const createdTables: CreatedTable[] = [...lockedTables];
    let globalTableNumber = lockedTables.filter((t) => t.table_type !== "imperial").length + 1;
    const hasLockedImperial = lockedTables.some((t) => t.table_type === "imperial");

    for (const spec of tableSpecs) {
      const isImperial = spec.isImperial === true;
      // Skip imperial se già lockato
      if (isImperial && hasLockedImperial) continue;

      const positions = generateTablePositions(
        spec.count,
        isImperial ? 0 : globalTableNumber - 1,
        isImperial,
      );

      for (let i = 0; i < spec.count; i++) {
        const tableName = isImperial ? "Tavolo Sposi" : `Tavolo ${globalTableNumber}`;

        const { data: newTable, error: insertError } = await serviceClient
          .from("tables")
          .insert({
            wedding_id: weddingId,
            name: tableName,
            capacity: spec.capacity,
            shape: isImperial ? "RECTANGULAR" : table_config.standard_shape.toUpperCase(),
            table_type: isImperial ? "imperial" : "standard",
            position_x: positions[i]?.x || 100,
            position_y: positions[i]?.y || 100,
            is_locked: false,
          })
          .select()
          .single();

        if (insertError) throw insertError;

        createdTables.push({
          id: newTable.id,
          name: newTable.name,
          capacity: newTable.capacity,
          table_type: newTable.table_type || "standard",
          shape: newTable.shape || "round",
          position_x: newTable.position_x,
          position_y: newTable.position_y,
          is_locked: false,
        });

        if (!isImperial) globalTableNumber++;
      }
    }

    console.log(`Total tables now: ${createdTables.length} (${lockedTables.length} locked)`);

    // 5. Fetch conflitti
    const { data: conflictsData } = await serviceClient
      .from("guest_conflicts")
      .select("guest_id_1, guest_id_2")
      .eq("wedding_id", weddingId);

    // 6. AI affinities (cache-first)
    const aiAffinities = await getCachedOrInferAffinities(serviceClient, weddingId, guestsToAssign);

    // 7. Run full pipeline (seeding → greedy → SA)
    const pipelineResult = runFullPipeline(
      guestsToAssign,
      createdTables.filter((t) => !lockedTables.includes(t)), // solo tavoli nuovi per la pipeline
      config || { allow_split_families: false, min_fill_rate: 0.8, party_categories: [] },
      vibe_mode || "BALANCED",
      conflictsData || [],
      aiAffinities,
      table_config.capacity_range,
    );

    // 8. Merge con assegnazioni lockate (quelle già c'erano, non le toccare)
    const allAssignments: Assignment[] = [...pipelineResult.assignments];
    lockedAssignments.forEach((guestIds, tableId) => {
      if (guestIds.length > 0) allAssignments.push({ tableId, guestIds });
    });

    // 9. Salva le nuove assegnazioni (non toccare le lockate già in DB)
    for (const assignment of pipelineResult.assignments) {
      for (const guestId of assignment.guestIds) {
        const { error } = await serviceClient.from("table_assignments").insert({
          table_id: assignment.tableId,
          guest_id: guestId,
        });
        if (error) console.error("Insert assignment error:", error);
      }
    }

    // 10. Se calculation_mode === 'confirmed', blocca tutti i tavoli
    if (calculation_mode === "confirmed") {
      const newTableIds = createdTables.filter((t) => !lockedTables.includes(t)).map((t) => t.id);
      if (newTableIds.length > 0) {
        await serviceClient.from("tables").update({ is_locked: true }).in("id", newTableIds);
      }
    }

    console.log(
      `Result: ${allAssignments.length} assignments, ${pipelineResult.unassigned.length} unassigned, quality=${pipelineResult.quality.score}`,
    );

    return new Response(
      JSON.stringify({
        assignments: allAssignments,
        unassigned: pipelineResult.unassigned,
        created_tables: createdTables,
        quality: pipelineResult.quality,
        sa_improvement_pct: pipelineResult.sa_improvement_pct,
        ai_affinities_count: aiAffinities.length,
        locked_tables_preserved: lockedTables.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error in smart-table-assigner:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
