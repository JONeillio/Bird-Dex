// Bird names inside a sentence, for Pearl's lines. The app shows "Barn Owl" on cards, but in speech she says
// "a barn owl": lower case, with an article, keeping capitals that belong to a person or a place.

// Words that stay capitalised inside a bird name (places, peoples, people's names without an apostrophe).
const PROPER = new Set([
  'American', 'Arctic', 'Balearic', 'Baltic', 'Bonaparte', 'Brent', 'British', 'Canada', 'Caspian', 'Chinese', 'Dartford',
  'Egyptian', 'Eurasian', 'European', 'Greenland', 'Iceland', 'Isabelline', 'Kentish', 'Lapland', 'Manx', 'Mandarin',
  'Mediterranean', 'Montagu', 'Pallas', 'Sandwich', 'Scottish', 'Siberian', 'Slavonian', 'Svalbard', 'Ural',
])

/** "Barn Owl" → "barn owl", "Cetti's Warbler" → "Cetti's warbler", "Canada Goose" → "Canada goose". */
export function birdInSentence(name: string): string {
  return name
    .trim()
    .split(/(\s+|-)/)
    .map((w) => (PROPER.has(w) || /['’]s$/.test(w) ? w : w.toLowerCase()))
    .join('')
}

/** "a barn owl", "an avocet", "a European shag" (sounds like "you"), "an Egyptian goose". */
export function aBird(name: string): string {
  const s = birdInSentence(name)
  const an = /^[aeiou]/i.test(s) && !/^(eu|uni|use|one)/i.test(s)
  return `${an ? 'an' : 'a'} ${s}`
}

/** "the barn owl". */
export function theBird(name: string): string {
  return `the ${birdInSentence(name)}`
}
