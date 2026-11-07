import { useEffect } from 'react'

interface Sentinel {
  release(): Promise<void>
}
interface WakeLockApi {
  request(type: 'screen'): Promise<Sentinel>
}

/** Keeps the screen on while enabled and the page is visible (the lock is released when the tab is hidden). */
export function useWakeLock(enabled: boolean): void {
  useEffect(() => {
    const api = typeof navigator !== 'undefined' ? (navigator as unknown as { wakeLock?: WakeLockApi }).wakeLock : undefined
    if (!enabled || !api) return
    let sentinel: Sentinel | null = null
    let dead = false
    const grab = async () => {
      try {
        const s = await api.request('screen')
        if (dead) void s.release()
        else sentinel = s
      } catch {
        /* low battery or not allowed: carry on without it */
      }
    }
    const onVisible = () => document.visibilityState === 'visible' && !sentinel && void grab()
    const onHide = () => {
      sentinel = null // the browser drops it when hidden; ask again when visible
    }
    void grab()
    document.addEventListener('visibilitychange', onVisible)
    document.addEventListener('visibilitychange', onHide)
    return () => {
      dead = true
      document.removeEventListener('visibilitychange', onVisible)
      document.removeEventListener('visibilitychange', onHide)
      void sentinel?.release()
    }
  }, [enabled])
}
