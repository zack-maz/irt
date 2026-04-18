import { z, type ZodTypeAny } from 'zod';

/**
 * Generic Zod schema for the `CacheResponse<T>` envelope that wraps every
 * cached API response in the server.
 *
 * Mirrors the OpenAPI `CacheResponseBase` allOf composition in
 * `server/openapi.yaml` lines 609-624 — kept deliberately loose on the
 * `data` payload so each route can specialize it with its own entity
 * schema (e.g. `cacheResponseSchema(z.array(flightEntitySchema))`).
 *
 * Fields:
 *  - `data`       — payload, shape varies per endpoint (caller supplies schema)
 *  - `stale`      — true when served from cache beyond its logical TTL
 *  - `lastFresh`  — Unix ms of last successful upstream fetch (0 when never fetched)
 *  - `rateLimited`— optional, set by flight route when upstream returns 429
 *  - `degraded`   — optional, set by cacheGetSafe when serving from memCache fallback
 */
export function cacheResponseSchema<S extends ZodTypeAny>(dataSchema: S) {
  return z.object({
    data: dataSchema,
    stale: z.boolean(),
    lastFresh: z.number(),
    rateLimited: z.boolean().optional(),
    degraded: z.boolean().optional(),
  });
}

// ---------- Entity payload schemas (simplified) ----------
//
// Each entity schema documents only the load-bearing fields checked in CI —
// anything else is `passthrough`ed so adding a new property in
// `server/types.ts` does not break validation until the schema is updated.
// This mirrors the intentionally-simplified OpenAPI surface area: documenting
// every nested property would duplicate the TypeScript type and create drift.

/** Minimal flight entity shape for response validation */
export const flightEntitySchema = z
  .object({
    id: z.string(),
    type: z.literal('flight'),
    lat: z.number(),
    lng: z.number(),
    timestamp: z.number(),
    label: z.string(),
    data: z
      .object({
        icao24: z.string(),
        callsign: z.string(),
        originCountry: z.string(),
        onGround: z.boolean(),
        unidentified: z.boolean(),
      })
      .passthrough(),
  })
  .passthrough();

/** Minimal conflict event entity shape for response validation */
export const conflictEventEntitySchema = z
  .object({
    id: z.string(),
    type: z.enum(['airstrike', 'on_ground', 'explosion', 'targeted', 'other']),
    lat: z.number(),
    lng: z.number(),
    timestamp: z.number(),
    label: z.string(),
    data: z
      .object({
        eventType: z.string(),
        subEventType: z.string(),
        fatalities: z.number(),
        cameoCode: z.string(),
        // LLM-enriched fields (all optional, present when LLM processed)
        summary: z.string().optional(),
        casualties: z
          .object({
            killed: z.number().optional(),
            injured: z.number().optional(),
            unknown: z.boolean().optional(),
          })
          .optional(),
        precision: z.enum(['exact', 'neighborhood', 'city', 'region']).optional(),
        actors: z.array(z.string()).optional(),
        sourceCount: z.number().optional(),
        llmProcessed: z.boolean().optional(),
      })
      .passthrough(),
  })
  .passthrough();

/** Minimal water facility entity shape for response validation */
export const waterFacilityEntitySchema = z
  .object({
    id: z.string(),
    type: z.literal('water'),
    facilityType: z.enum(['dam', 'reservoir', 'desalination']),
    lat: z.number(),
    lng: z.number(),
    label: z.string(),
    osmId: z.number(),
    stress: z
      .object({
        compositeHealth: z.number(),
      })
      .passthrough(),
    capacity: z
      .object({
        height: z.number().optional(),
        volume: z.number().optional(),
        area: z.number().optional(),
      })
      .optional(),
    nearestCity: z
      .object({
        name: z.string(),
        distanceKm: z.number(),
        population: z.number(),
      })
      .optional(),
    linkedRiver: z
      .object({
        name: z.string(),
        distanceKm: z.number(),
      })
      .optional(),
    notabilityScore: z.number().optional(),
  })
  .passthrough();

const waterFilterStatsSchema = z
  .object({
    rawCounts: z.record(z.string(), z.number()),
    filteredCounts: z.record(z.string(), z.number()),
    rejections: z.object({
      excluded_location: z.number(),
      not_notable: z.number(),
      no_name: z.number(),
      duplicate: z.number(),
      low_score: z.number(),
      no_city: z.number(),
    }),
    enrichment: z.object({
      withCapacity: z.number(),
      withCity: z.number(),
      withRiver: z.number(),
    }),
    scoreHistogram: z.array(z.object({ bucket: z.string(), count: z.number() })),
  })
  .optional();

// ---------- Wrapped CacheResponse schemas per route ----------

export const flightsResponseSchema = cacheResponseSchema(z.array(flightEntitySchema));
export const eventsResponseSchema = cacheResponseSchema(z.array(conflictEventEntitySchema));
export const waterResponseSchema = cacheResponseSchema(z.array(waterFacilityEntitySchema)).extend({
  filterStats: waterFilterStatsSchema,
});
