// A made-up eBird "Download My Data" file, so the app can be tried without anyone's real history.
// Everything here is invented: the sites are labelled "Sample", ids are L99… (not real hotspots), and the dates run
// from January 2024 to today. Submission ids start SMP so they can never match a real eBird checklist.
// It goes through exactly the same import as a real file.
import type { Traits } from '../game'
import { rngFor } from '../../domain/random'

export interface SampleSpecies {
  id: string
  name: string
  sciName: string
  habitat: string
  sets: readonly string[]
}

type Habitat = 'garden' | 'woodland' | 'wetland' | 'coast' | 'raptors' | 'farmland-upland'

interface SampleSite {
  id: string
  name: string
  habitat: Habitat
  /** How often the made-up birder goes there. */
  weight: number
  /** Short garden-style lists vs full days out. */
  short?: boolean
}

const SITES: readonly SampleSite[] = [
  { id: 'L99000001', name: 'Sample Reedbed Reserve', habitat: 'wetland', weight: 4 },
  { id: 'L99000002', name: 'Sample Marsh Hide', habitat: 'wetland', weight: 3 },
  { id: 'L99000003', name: 'Sample Estuary Point', habitat: 'coast', weight: 3 },
  { id: 'L99000004', name: 'Sample Saltmarsh Walk', habitat: 'coast', weight: 2 },
  { id: 'L99000005', name: 'Sample Wood Reserve', habitat: 'woodland', weight: 3 },
  { id: 'L99000006', name: 'Sample Heath Edge', habitat: 'woodland', weight: 1 },
  { id: 'L99000007', name: 'Sample Farmland Loop', habitat: 'farmland-upland', weight: 3 },
  { id: 'L99000008', name: 'Sample Downs Viewpoint', habitat: 'raptors', weight: 2 },
  { id: 'L99000009', name: 'Sample Town Park', habitat: 'garden', weight: 2, short: true },
  { id: 'L99000010', name: 'Sample Garden', habitat: 'garden', weight: 4, short: true },
  { id: 'L99000011', name: 'Sample Canal Path', habitat: 'wetland', weight: 1 },
  { id: 'L99000012', name: 'Sample Gravel Pits', habitat: 'wetland', weight: 2 },
]

interface Outside {
  name: string
  sci: string
  habitat: Habitat
  status: 'resident' | 'summer' | 'winter'
}

/** Birds not in the Starter Dex, so the life list has something beyond it. Anything that is in the Dex is skipped. */
const OUTSIDE: readonly Outside[] = [
  { name: 'Common Firecrest', sci: 'Regulus ignicapilla', habitat: 'woodland', status: 'winter' },
  { name: 'Eurasian Hobby', sci: 'Falco subbuteo', habitat: 'raptors', status: 'summer' },
  { name: 'Common Crane', sci: 'Grus grus', habitat: 'wetland', status: 'resident' },
  { name: 'Black-necked Grebe', sci: 'Podiceps nigricollis', habitat: 'wetland', status: 'winter' },
  { name: 'Pied Flycatcher', sci: 'Ficedula hypoleuca', habitat: 'woodland', status: 'summer' },
  { name: 'Common Redstart', sci: 'Phoenicurus phoenicurus', habitat: 'woodland', status: 'summer' },
  { name: 'Hawfinch', sci: 'Coccothraustes coccothraustes', habitat: 'woodland', status: 'winter' },
  { name: 'Green Sandpiper', sci: 'Tringa ochropus', habitat: 'wetland', status: 'winter' },
  { name: 'Wood Sandpiper', sci: 'Tringa glareola', habitat: 'wetland', status: 'summer' },
  { name: 'Spotted Flycatcher', sci: 'Muscicapa striata', habitat: 'garden', status: 'summer' },
  { name: 'Western Yellow Wagtail', sci: 'Motacilla flava', habitat: 'farmland-upland', status: 'summer' },
  { name: 'Whinchat', sci: 'Saxicola rubetra', habitat: 'farmland-upland', status: 'summer' },
  { name: 'Eurasian Tree Sparrow', sci: 'Passer montanus', habitat: 'farmland-upland', status: 'resident' },
  { name: 'Corn Bunting', sci: 'Emberiza calandra', habitat: 'farmland-upland', status: 'resident' },
  { name: 'Northern Wheatear', sci: 'Oenanthe oenanthe', habitat: 'coast', status: 'summer' },
  { name: 'Eurasian Spoonbill', sci: 'Platalea leucorodia', habitat: 'coast', status: 'summer' },
  { name: 'Purple Sandpiper', sci: 'Calidris maritima', habitat: 'coast', status: 'winter' },
  { name: 'Slavonian Grebe', sci: 'Podiceps auritus', habitat: 'coast', status: 'winter' },
  { name: 'Bohemian Waxwing', sci: 'Bombycilla garrulus', habitat: 'garden', status: 'winter' },
  { name: 'Great Grey Shrike', sci: 'Lanius excubitor', habitat: 'farmland-upland', status: 'winter' },
  { name: "Cetti's Warbler", sci: 'Cettia cetti', habitat: 'wetland', status: 'resident' },
  { name: 'Dartford Warbler', sci: 'Curruca undata', habitat: 'woodland', status: 'resident' },
  { name: 'Common Nightingale', sci: 'Luscinia megarhynchos', habitat: 'woodland', status: 'summer' },
  { name: 'Garganey', sci: 'Spatula querquedula', habitat: 'wetland', status: 'summer' },
  { name: 'Red-necked Phalarope', sci: 'Phalaropus lobatus', habitat: 'coast', status: 'summer' },
]

/** Everyday birds: seen on most outings where the habitat fits. */
const EVERYDAY = new Set(['mallard', 'eurasian-blue-tit', 'great-tit', 'european-robin', 'eurasian-blackbird', 'common-wood-pigeon', 'eurasian-magpie', 'carrion-crow', 'eurasian-wren', 'dunnock', 'house-sparrow', 'common-starling', 'black-headed-gull', 'canada-goose', 'mute-swan', 'eurasian-coot', 'common-moorhen', 'european-goldfinch', 'common-chaffinch', 'herring-gull', 'great-cormorant', 'grey-heron', 'common-buzzard', 'common-kestrel', 'western-jackdaw', 'rook', 'tufted-duck', 'long-tailed-tit', 'song-thrush', 'common-chiffchaff', 'eurasian-blackcap', 'northern-lapwing'])
/** Scarce ones: seen now and then. */
const SCARCE = new Set(['peregrine-falcon', 'red-kite', 'water-rail', 'eurasian-wigeon', 'gadwall', 'common-sandpiper', 'common-tern', 'tawny-owl', 'eurasian-treecreeper', 'eurasian-nuthatch', 'common-snipe', 'eurasian-curlew', 'yellowhammer', 'reed-bunting', 'lesser-redpoll', 'eurasian-siskin', 'mistle-thrush', 'grey-wagtail', 'sedge-warbler', 'common-whitethroat', 'stock-dove', 'red-legged-partridge', 'greylag-goose'])
/** Never seen by the made-up birder, so there are always birds left to look for. */
const NEVER_SEEN = new Set(['eurasian-bittern', 'white-throated-dipper', 'common-goldeneye', 'whooper-swan', 'pink-footed-goose', 'grey-partridge', 'little-owl', 'brambling', 'bohemian-waxwing', 'mew-gull', 'european-stonechat', 'goosander', 'western-barn-owl', 'eurasian-green-woodpecker'])

const HEADER =
  'Submission ID,Common Name,Scientific Name,Taxonomic Order,Count,State/Province,County,Location ID,Location,Latitude,Longitude,Date,Time,Protocol,Duration (Min),All Obs Reported,Distance Traveled (km),Area Covered (ha),Number of Observers,Breeding Code,Observation Details,Checklist Comments,ML Catalog Numbers'

const csvField = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)
const pad = (n: number, w = 2) => String(n).padStart(w, '0')
const isoOf = (t: number) => {
  const d = new Date(t)
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
}
const time12 = (h: number, m: number) => `${pad(h % 12 === 0 ? 12 : h % 12)}:${pad(m)} ${h < 12 ? 'AM' : 'PM'}`

/** How present a bird is in a given month: residents all year, visitors only in their season (half at the edges). */
function seasonFactor(status: 'resident' | 'summer' | 'winter', month: number): number {
  if (status === 'resident') return 1
  if (status === 'summer') return month >= 5 && month <= 8 ? 1 : month === 4 || month === 9 ? 0.5 : 0
  return month === 12 || month <= 2 ? 1 : month === 3 || month === 11 ? 0.5 : month === 10 ? 0.3 : 0
}

export interface SampleOptions {
  species: readonly SampleSpecies[]
  traitsOf: (id: string) => Traits | undefined
  /** Today as YYYY-MM-DD: no sighting is dated after it. */
  today: string
  seed?: string
}

/** The made-up export as CSV text, in eBird's own column layout. The same inputs always give the same file. */
export function generateSampleHistory(o: SampleOptions): string {
  const rng = rngFor(o.seed ?? 'birdquest-sample-history-v1')
  const dexSci = new Set(o.species.map((s) => s.sciName))

  interface Candidate {
    key: string
    name: string
    sci: string
    sets: readonly string[]
    primary: string
    status: 'resident' | 'summer' | 'winter'
    common: number
  }
  const candidates: Candidate[] = [
    ...o.species.filter((s) => !NEVER_SEEN.has(s.id)).map((s) => ({ key: s.id, name: s.name, sci: s.sciName, sets: s.sets, primary: s.habitat, status: o.traitsOf(s.id)?.status ?? 'resident' })),
    ...OUTSIDE.filter((b) => !dexSci.has(b.sci)).map((b) => ({ key: `x-${b.sci}`, name: b.name, sci: b.sci, sets: [b.habitat] as readonly string[], primary: b.habitat as string, status: b.status })),
  ].map((c) => ({
    ...c,
    common: EVERYDAY.has(c.key) ? 0.7 + 0.3 * rng() : SCARCE.has(c.key) ? 0.06 + 0.1 * rng() : 0.03 + 0.4 * Math.pow(rng(), 2),
  }))

  const start = Date.UTC(2024, 0, 1)
  const end = Date.parse(`${o.today}T00:00:00Z`)
  const siteTotal = SITES.reduce((n, s) => n + s.weight, 0)
  const pickSite = () => {
    let r = rng() * siteTotal
    for (const s of SITES) if ((r -= s.weight) < 0) return s
    return SITES[0]!
  }

  const lines: string[] = [HEADER]
  let subNo = 0
  for (let t = start; t <= end; t += 86400000) {
    const dow = new Date(t).getUTCDay()
    if (rng() > (dow === 0 || dow === 6 ? 0.5 : 0.13)) continue
    const site = pickSite()
    const date = isoOf(t)
    const month = new Date(t).getUTCMonth() + 1
    const hour = site.short ? (rng() < 0.6 ? 7 : 17 + Math.floor(rng() * 2)) : 6 + Math.floor(rng() * 5) + (month >= 5 && month <= 8 ? 0 : 1)
    const minute = Math.floor(rng() * 4) * 15
    const subId = `SMP${pad(++subNo, 6)}`
    const cap = site.short ? 8 + Math.floor(rng() * 8) : 16 + Math.floor(rng() * 20)
    const duration = site.short ? 15 + Math.floor(rng() * 30) : 60 + Math.floor(rng() * 150)

    const seen = candidates
      .map((c) => {
        const habitat = c.primary === site.habitat ? 1 : c.sets.includes(site.habitat) ? 0.6 : site.habitat === 'raptors' && c.sets.includes('farmland-upland') ? 0.4 : 0
        return { c, p: c.common * habitat * seasonFactor(c.status, month) }
      })
      .filter(({ p }) => rng() < p)
      .sort((a, b) => b.p - a.p)
      .slice(0, cap)

    const rows = seen.map(({ c }) => ({ name: c.name, sci: c.sci, n: 1 + Math.floor(rng() * rng() * 12) }))
    // The odd row eBird exports that is not a single species, so the "needs a look" list has something real in it.
    if (site.habitat === 'coast' && rng() < 0.3) rows.push({ name: 'gull sp.', sci: 'Larus sp.', n: 1 + Math.floor(rng() * 6) })
    if (rng() < 0.04) rows.push({ name: 'Carrion/Hooded Crow', sci: 'Corvus corone/cornix', n: 2 })
    if (site.habitat === 'wetland' && rng() < 0.08) rows.push({ name: 'Mallard (Domestic type)', sci: 'Anas platyrhynchos (Domestic type)', n: 2 })

    for (const r of rows) {
      lines.push(
        [subId, r.name, r.sci, '', String(r.n), 'GB-SMP', 'Sample County', site.id, site.name, '0', '0', date, time12(hour, minute), site.short ? 'Stationary' : 'Traveling', String(duration), '1', site.short ? '' : '3.0', '', '1', '', '', '', '']
          .map(csvField)
          .join(','),
      )
    }
  }
  // A few old paper-notebook entries with no date, which a real export can contain.
  for (const c of candidates.slice(0, 3)) lines.push(['SMP900000', c.name, c.sci, '', '1', 'GB-SMP', 'Sample County', SITES[9]!.id, SITES[9]!.name, '0', '0', '', '', 'Historical', '', '0', '', '', '1', '', '', '', ''].map(csvField).join(','))
  return lines.join('\n') + '\n'
}
