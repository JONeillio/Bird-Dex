import { create } from 'zustand'
import { tourById } from '../data/tours'
import { useStore } from './store'

export type Facts = Record<string, string | number | null | undefined>

interface TourState {
  /** The tour playing now, or null. */
  tourId: string | null
  step: number
  /** Turned down with "Not now" this visit: don't start again until the app is reopened. */
  snoozed: boolean
  /** Live values screens publish for {tokens} in Dot's lines (today's site, your Dex count...). */
  facts: Facts
  start: (id: string) => void
  next: () => void
  /** Close the tour. `remember` stops it starting by itself again. */
  stop: (remember: boolean) => void
  setFacts: (f: Facts) => void
}

export const useTour = create<TourState>((set, get) => ({
  tourId: null,
  step: 0,
  snoozed: false,
  facts: {},
  start: (id) => {
    if (!tourById(id)) return
    set({ tourId: id, step: 0 })
  },
  next: () => {
    const { tourId, step } = get()
    const tour = tourId ? tourById(tourId) : undefined
    if (!tour) return
    if (step + 1 >= tour.steps.length) get().stop(true)
    else set({ step: step + 1 })
  },
  stop: (remember) => {
    const { tourId } = get()
    if (remember && tourId) {
      const prefs = useStore.getState().prefs
      if (!prefs.toursDone.includes(tourId)) useStore.getState().setPref('toursDone', [...prefs.toursDone, tourId])
    }
    set({ tourId: null, step: 0, snoozed: !remember || get().snoozed })
  },
  setFacts: (f) => {
    const cur = get().facts
    if (Object.keys(f).every((k) => cur[k] === f[k])) return
    set({ facts: { ...cur, ...f } })
  },
}))

/** Whether the welcome tour should start by itself now. */
export function shouldAutoStart(id: string, toursDone: readonly string[], snoozed: boolean, routeName: string): boolean {
  return !snoozed && !toursDone.includes(id) && routeName !== 'dev' && routeName !== 'settings' && !!tourById(id)?.auto
}
