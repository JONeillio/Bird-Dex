// Plain-English facts for a bird's profile, built from the curated traits (AUTOPILOT P6). Pure.
import { traitsById, type Traits } from '../data/game'
import type { Bond } from './bond'

const SIZE: Record<Traits['size'], string> = { tiny: 'Tiny', small: 'Small', medium: 'Medium', large: 'Large', huge: 'Huge' }
const DIET: Record<Traits['diet'], string> = {
  seeds: 'eats seeds',
  insects: 'eats insects',
  inverts: 'eats small invertebrates',
  fish: 'eats fish',
  plants: 'eats plants',
  prey: 'hunts other animals',
  omnivore: 'eats almost anything',
}
const STATUS: Record<Traits['status'], string> = { resident: 'resident all year', winter: 'winter visitor', summer: 'summer visitor' }

function activity(t: Traits): string {
  if (t.songster) return t.active === 'diurnal' ? 'sings at dawn' : t.active === 'crepuscular' ? 'sings at dawn and dusk' : 'sings at night'
  return t.active === 'diurnal' ? 'active by day' : t.active === 'crepuscular' ? 'active at dawn and dusk' : 'active at night'
}

/** One line such as "Small · eats insects · resident all year · sings at dawn". Empty for a bird outside the Starter Dex. */
export function fieldNotes(speciesId: string): string {
  const t = traitsById(speciesId)
  if (!t) return ''
  return [SIZE[t.size], DIET[t.diet], STATUS[t.status], activity(t)].join(' · ')
}

/** Months 1-12 in which the bird has never been recorded, in order. */
export function missingMonths(bond: Pick<Bond, 'monthsSeen'>): number[] {
  const have = new Set(bond.monthsSeen)
  return Array.from({ length: 12 }, (_, i) => i + 1).filter((m) => !have.has(m))
}
