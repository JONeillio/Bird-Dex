import { PixelIcon } from '../../ui/components'

export function SettingsButton() {
  return (
    <a className="icon-btn" href="#/settings" aria-label="Settings">
      <PixelIcon name="gear" colour="#fffbef" size={28} />
    </a>
  )
}

export function BackButton({ to }: { to: string }) {
  return (
    <a className="icon-btn" href={to} aria-label="Back">
      ←
    </a>
  )
}
