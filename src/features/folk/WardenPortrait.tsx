import { personaById, wardenArt, WARDEN_SILHOUETTE } from '../../art/wardens'

/** The warden's portrait once you have been to their site, otherwise the silhouette. */
export function WardenPortrait({ persona, met, size = 96 }: { persona: string; met: boolean; size?: number }) {
  const art = met ? wardenArt(persona) : WARDEN_SILHOUETTE
  const name = personaById(persona)?.name ?? 'Warden'
  if (!art) return <span className="warden-fallback" style={{ width: size, height: size }} role="img" aria-label={name}>{name.slice(0, 1)}</span>
  return <img className="warden-img" src={art.src} srcSet={`${art.src} 1x, ${art.src2x} 2x`} width={size} height={size} alt={met ? name : 'A warden you have not met yet'} draggable={false} />
}
