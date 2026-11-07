// Check every Starter Dex species against eBird's taxonomy (en_GB species list).
// Reports only our own catalogue entries: matches, misses, and the closest eBird name for each miss.
import { readFileSync } from 'node:fs'
import { timedFetch, writeReport, redact } from './lib/http.ts'

interface Entry { id: string; name: string; ebirdName: string; sciName: string }
interface Tax { sciName: string; comName: string; speciesCode: string; category: string }

async function main(): Promise<void> {
  const key = process.env.EBIRD_API_KEY
  if (!key) throw new Error('EBIRD_API_KEY not available to this run')
  const dex = JSON.parse(readFileSync('src/data/catalogue/starter-dex.v1.json', 'utf8')) as { species: Entry[] }
  const res = await timedFetch('https://api.ebird.org/v2/ref/taxonomy/ebird?fmt=json&locale=en_GB&cat=species', { headers: { 'X-eBirdApiToken': key } })
  const tax = Array.isArray(res.json) ? (res.json as Tax[]) : []
  if (!res.ok || tax.length === 0) throw new Error(`taxonomy fetch failed: status ${res.status} ${res.error ?? ''}`)
  const bySci = new Map(tax.map((t) => [t.sciName, t]))
  const byName = new Map(tax.map((t) => [t.comName.toLowerCase(), t]))

  const rows = dex.species.map((s) => {
    const hit = bySci.get(s.sciName)
    if (hit) return { id: s.id, status: hit.comName.toLowerCase() === s.ebirdName.toLowerCase() ? 'ok' : 'name-differs', ours: s.ebirdName, ebird: hit.comName, code: hit.speciesCode }
    const byCommon = byName.get(s.ebirdName.toLowerCase())
    const genus = s.sciName.split(' ')[0]
    const near = tax.filter((t) => t.sciName.startsWith(genus + ' ')).map((t) => `${t.sciName} (${t.comName})`).slice(0, 4)
    return { id: s.id, status: 'MISS', ours: `${s.sciName} / ${s.ebirdName}`, ebirdSameCommonName: byCommon ? `${byCommon.sciName} (${byCommon.comName})` : null, sameGenus: near }
  })
  const miss = rows.filter((r) => r.status === 'MISS')
  const differs = rows.filter((r) => r.status === 'name-differs')
  const md = [
    '# Taxonomy check', '',
    `Catalogue ${dex.species.length} species; eBird list ${tax.length}. OK: ${rows.filter((r) => r.status === 'ok').length}. Name differs: ${differs.length}. Missing: ${miss.length}.`, '',
    '## Missing (fix the scientific name or the species)', '```json', JSON.stringify(miss, null, 1), '```', '',
    '## Same scientific name, different common name (fine, check display name)', '```json', JSON.stringify(differs, null, 1), '```',
  ].join('\n')
  writeReport('taxonomy-check', { rows }, md)
  if (miss.length) process.exitCode = 1
}

main().catch((e) => {
  console.error(redact(e instanceof Error ? e.message : String(e)))
  process.exitCode = 1
})
