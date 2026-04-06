// Pipeline trace types and audit record builder for GDELT event pipeline
// Enables audit-first filter tuning by capturing detailed per-event pipeline decisions

import type { ConflictEventEntity, ConflictEventType } from '../types.js';

/**
 * Phase A filtering checks (raw CSV row level).
 * All boolean: true = passed, false = failed.
 */
export interface PhaseAChecks {
  rootCode: boolean;       // EventRootCode in CONFLICT_ROOT_CODES
  cameoExclusion: boolean; // EventBaseCode not in excluded list
  middleEast: boolean;     // ActionGeo_CountryCode in MIDDLE_EAST_FIPS
  geoValid: boolean;       // FullName/FIPS cross-validation passed
  minSources: boolean;     // NumSources >= threshold
  actorCountry: boolean;   // At least one actor with country code
}

/**
 * Confidence sub-scores computed in Phase B.
 */
export interface ConfidenceSubScores {
  mediaCoverage: number;       // 0-1, weight 0.25
  sourceDiversity: number;     // 0-1, weight 0.15
  actorSpecificity: number;    // 0-1, weight 0.15
  geoPrecisionSignal: number;  // 0-1, weight 0.10
  goldsteinConsistency: number; // 0-1, weight 0.10
  cameoSpecificity: number;    // 0-1, weight 0.25
}

/**
 * Phase B processing checks (entity level).
 */
export interface PhaseBChecks {
  originalType: ConflictEventType; // Type before Goldstein reclassification
  reclassified: boolean;           // Was the type changed by Goldstein sanity?
  geoPrecision: 'precise' | 'centroid';
  confidenceSubScores: ConfidenceSubScores;
  finalConfidence: number;  // 0-1 composite score
  passedThreshold: boolean; // finalConfidence >= threshold
}

/**
 * Dispersion metadata for centroid events.
 */
export interface DispersionInfo {
  ringIndex: number;
  slotIndex: number;
  originalLat: number;
  originalLng: number;
  dispersedLat: number;
  dispersedLng: number;
}

/**
 * Phase C NLP geo cross-validation checks.
 */
export interface PhaseCChecks {
  titleFetched: boolean;
  nlpActors: string[];
  nlpPlaces: string[];
  validationStatus: 'verified' | 'mismatch' | 'relocated' | 'skipped';
  relocatedTo?: { lat: number; lng: number; cityName: string };
  mismatchReason?: string;
  skipReason?: string;
}

/**
 * Full pipeline trace for a single GDELT event.
 * Captures every decision point in the processing pipeline.
 */
export interface PipelineTrace {
  phaseA: PhaseAChecks;
  phaseB: PhaseBChecks;
  phaseC?: PhaseCChecks;
  bellingcatMatch?: boolean;
  dispersion?: DispersionInfo;
  rejectionReason?: string;
  actionGeoType?: number;
}

/**
 * Audit record wrapping an event with its full pipeline trace.
 */
export interface AuditRecord {
  id: string;
  status: 'accepted' | 'rejected';
  event: ConflictEventEntity | null; // null for rejected events
  pipelineTrace: PipelineTrace;
  rawGdeltColumns: Record<string, string>;
}

/**
 * Build an AuditRecord from pipeline processing state.
 */
export function buildAuditRecord(params: {
  id: string;
  status: 'accepted' | 'rejected';
  event: ConflictEventEntity | null;
  pipelineTrace: PipelineTrace;
  rawGdeltColumns: Record<string, string>;
}): AuditRecord {
  return {
    id: params.id,
    status: params.status,
    event: params.event,
    pipelineTrace: params.pipelineTrace,
    rawGdeltColumns: params.rawGdeltColumns,
  };
}
