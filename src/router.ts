import { useEffect, useState } from 'react'

export type Route =
  | { name: 'map' }
  | { name: 'dex' }
  | { name: 'journal' }
  | { name: 'bird'; id: string }
  | { name: 'report'; key: string }
  | { name: 'news' }
  | { name: 'plan' }
  | { name: 'find'; key: string }
  | { name: 'badges' }
  | { name: 'folk' }
  | { name: 'warden'; id: string }
  | { name: 'callit'; id: string }
  | { name: 'npc'; id: string }
  | { name: 'settings' }
  | { name: 'dev'; page: string }

/** Parse a location hash like "#/bird/european-robin". Unknown hashes go to the map. */
export function parseHash(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean)
  switch (parts[0]) {
    case 'dex':
      return { name: 'dex' }
    case 'journal':
      return { name: 'journal' }
    case 'settings':
      return { name: 'settings' }
    case 'news':
      return { name: 'news' }
    case 'plan':
      return { name: 'plan' }
    case 'badges':
      return { name: 'badges' }
    case 'find':
      return parts[1] ? { name: 'find', key: decodeURIComponent(parts[1]) } : { name: 'map' }
    case 'folk':
      if (parts[1] === 'warden' && parts[2]) return { name: 'warden', id: decodeURIComponent(parts[2]) }
      if (parts[1] === 'callit' && parts[2]) return { name: 'callit', id: decodeURIComponent(parts[2]) }
      if (parts[1] === 'npc' && parts[2]) return { name: 'npc', id: decodeURIComponent(parts[2]) }
      return { name: 'folk' }
    case 'report':
      return parts[1] ? { name: 'report', key: decodeURIComponent(parts[1]) } : { name: 'journal' }
    case 'bird':
      return parts[1] ? { name: 'bird', id: decodeURIComponent(parts[1]) } : { name: 'dex' }
    case 'dev':
      return { name: 'dev', page: parts[1] ?? 'ui' }
    default:
      return { name: 'map' }
  }
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash))
  useEffect(() => {
    const onChange = () => setRoute(parseHash(window.location.hash))
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return route
}

export function link(route: Route): string {
  switch (route.name) {
    case 'bird':
      return `#/bird/${encodeURIComponent(route.id)}`
    case 'report':
      return `#/report/${encodeURIComponent(route.key)}`
    case 'find':
      return `#/find/${encodeURIComponent(route.key)}`
    case 'warden':
      return `#/folk/warden/${encodeURIComponent(route.id)}`
    case 'callit':
      return `#/folk/callit/${encodeURIComponent(route.id)}`
    case 'npc':
      return `#/folk/npc/${encodeURIComponent(route.id)}`
    case 'dev':
      return `#/dev/${route.page}`
    default:
      return `#/${route.name}`
  }
}
