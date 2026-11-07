/**
 * Proposed BirdQuest domain contracts — 7 November 2026.
 * App-owned types, NOT verified eBird/ORS response schemas or a running app.
 * Map provider schemas through validation in separate adapters.
 */

export type SpeciesId = string;
export type SiteId = string;
export type ISODate = string; // YYYY-MM-DD; preserve the source's date semantics.
export type ISOInstant = string; // ISO 8601 with explicit timezone, when known.

/** GeoJSON/routing coordinate convention. Validate ranges at adapter boundaries. */
export type LngLat = readonly [longitude: number, latitude: number];

export interface Species {
  id: SpeciesId;
  commonName: string;
  scientificName: string;
  familyCode?: string;
  familyName?: string;
  providerIds: { ebird?: string; inaturalist?: number; gbif?: number };
  taxonomyVersion: string;
  collectionSetIds: string[]; // Curated overlapping tags, not taxonomy.
  portraitAssetId?: string;
}

export interface Catalogue {
  id: string;
  label: string;
  version: string;
  sourceUrl: string;
  speciesIds: SpeciesId[]; // Stable membership; never derive from current map pan.
}

export interface BirdingSite {
  id: SiteId;
  name: string;
  reportPoint: LngLat;
  providerIds: { ebirdHotspot?: string };
  entrance?: { point: LngLat; sourceUrl?: string; reviewedAt?: ISOInstant };
  access: "public" | "restricted" | "private" | "unknown";
  accessNote?: string;
  sourceUrl?: string;
  sourceLocationPrecision: "site" | "generalised" | "unknown";
}

/** eBird local time often has no offset: do not invent one. */
export interface ObservationMoment {
  sourceValue: string;
  localDate: ISODate;
  localTime?: string;
  timezone?: string;
  precision: "date" | "datetime";
  instant?: ISOInstant; // Only populated when an offset/timezone is resolved.
}

export interface PublicObservation {
  id: string; // Source-qualified, deduped; no claim of independent observer count.
  speciesId: SpeciesId;
  siteId: SiteId;
  observed: ObservationMoment;
  fetchedAt: ISOInstant;
  source: "ebird" | "inaturalist";
  sourceRecordId: string;
  sourceChecklistId?: string;
  sourceUrl: string;
  reportedCount?: number; // Absent is unknown/presence-only, never zero.
  review: "accepted" | "provisional" | "unknown";
  sourceNotable?: boolean; // Not conservation status or national rarity.
  isDemo: boolean;
}

export interface PersonalEncounter {
  id: string;
  speciesId: SpeciesId;
  date?: ISODate; // Optional for a species-only imported list.
  siteId?: SiteId;
  privateLocation?: LngLat;
  locationLabel?: string;
  basis: "seen" | "heard" | "seen-and-heard" | "unspecified";
  notes?: string;
  source: "manual" | "ebird-export" | "birdtrack-export" | "generic-list";
  sourceRecordId?: string;
  originalTaxonText?: string;
  importBatchId?: string;
  createdAt: ISOInstant;
  isDemo: boolean;
}

export interface SpeciesPreference {
  speciesId: SpeciesId;
  isTarget: boolean;
  isFavourite: boolean;
}

/** Derived from personal records, not a second independent record of truth. */
export interface CollectionEntry {
  speciesId: SpeciesId;
  status: "unrecorded" | "recorded";
  personalRecordCount: number;
  firstKnownRecordDate?: ISODate;
  lastKnownRecordDate?: ISODate;
  // Missing dates do not imply the species is unrecorded.
}

export interface DriveEstimate {
  siteId: SiteId;
  originCacheKey: string; // Do not expose raw home coordinates in public logs.
  status: "ok" | "unreachable" | "error";
  seconds?: number; // Present only for status=ok; never substitute zero on failure.
  metres?: number;
  destination: "reviewed-entrance" | "approximate-site-point";
  profile: "driving-car";
  provider: "openrouteservice";
  liveTrafficIncluded: false;
  fetchedAt: ISOInstant;
}

export interface MediaAsset {
  id: string;
  speciesId?: SpeciesId;
  kind: "pixel-portrait" | "map-icon" | "bird-call" | "ui-sound";
  sourceUrl?: string;
  creator: string;
  licence: string; // Exact per-asset licence, not a provider-wide assumption.
  attribution: string;
  reuseDecision: "approved" | "link-only" | "unverified";
  localPath?: string;
}

export interface ImportIssue {
  rowNumber: number;
  kind: "unmapped-taxon" | "ambiguous-taxon" | "duplicate" | "invalid-row";
  originalTaxonText?: string;
  message: string;
}

export interface ImportPreview {
  importBatchId: string;
  source: PersonalEncounter["source"];
  candidateRecords: PersonalEncounter[];
  issues: ImportIssue[];
  newSpeciesCount: number;
  existingRecordCount: number;
}

export interface DiscoveryFilters {
  origin: LngLat;
  driveLimitMinutes: 30 | 60 | 90;
  reportWindowDays: number; // Validate against live provider limits.
  onlyUnrecorded: boolean;
  onlyTargets: boolean;
  speciesId?: SpeciesId;
  sort: "new-species" | "nearest" | "target-match";
}

export interface DiscoveryResult {
  sites: BirdingSite[];
  observations: PublicObservation[];
  driveEstimates: DriveEstimate[];
  fetchedAt: ISOInstant;
  isDemo: boolean;
  coverage: {
    areaLabel: string;
    inventoryCandidateCount: number;
    routedCount: number;
    reportsFetchedSiteCount: number;
    truncated: boolean;
    note?: string;
  };
}
