// Matching birds by scientific name. One source of truth, used by the pipeline, the importers and the log sheet.

/** Not a single species: "gull sp.", "Carrion/Hooded Crow", hybrids, domestic types. */
export function isNotASpecies(sciName: string, comName: string): boolean {
  return / sp\.$/.test(sciName) || sciName.includes('/') || / x /.test(sciName) || /domestic/i.test(comName)
}

/** Join to the Starter Dex by scientific name; subspecies forms fall back to the two-word binomial. */
export function dexIdFor(sciName: string, dexBySci: ReadonlyMap<string, string>): string | null {
  const exact = dexBySci.get(sciName)
  if (exact) return exact
  const binomial = sciName.split(' ').slice(0, 2).join(' ')
  return dexBySci.get(binomial) ?? null
}

/**
 * Id for a bird that is not in the Starter Dex: `x-` plus the scientific name lowercased, spaces to hyphens,
 * everything except a-z and hyphens removed (`Regulus ignicapilla` becomes `x-regulus-ignicapilla`).
 * Always a valid species id, so an odd name can never make a whole backup fail to load.
 */
export function outsideId(sciName: string): string {
  const slug = sciName
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  return `x-${slug || 'unknown'}`
}

/** True for a bird outside the Starter Dex (logged or imported by name). */
export function isOutsideId(speciesId: string): boolean {
  return speciesId.startsWith('x-')
}
