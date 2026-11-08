import { create } from 'zustand'
import type { Encounter } from '../data/personal-schema'

export interface LogRequest {
  speciesId?: string
  place?: string
  /** The eBird site the sighting is at, when the caller knows it. */
  siteId?: string
  /** A bird outside the Starter Dex (from a public report), logged by name. */
  outside?: { name: string; sciName: string }
  /** Edit this existing sighting instead of adding a new one. */
  edit?: Encounter
}
export interface RevealRequest {
  speciesId: string
  /** First ever sighting of this species (the big reveal) rather than another sighting of a known one. */
  firstTime: boolean
}

interface UiState {
  logRequest: LogRequest | null
  openLog: (r?: LogRequest) => void
  closeLog: () => void
  reveal: RevealRequest | null
  showReveal: (r: RevealRequest) => void
  closeReveal: () => void
  toast: { text: string; nonce: number } | null
  say: (text: string) => void
  clearToast: () => void
}

export const useUi = create<UiState>((set) => ({
  logRequest: null,
  openLog: (r = {}) => set({ logRequest: r }),
  closeLog: () => set({ logRequest: null }),
  reveal: null,
  showReveal: (reveal) => set({ reveal }),
  closeReveal: () => set({ reveal: null }),
  toast: null,
  say: (text) => set({ toast: { text, nonce: Date.now() } }),
  clearToast: () => set({ toast: null }),
}))
