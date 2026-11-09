import { useEffect, type ReactNode } from 'react'
import { iconUrl, type IconName } from '../art/icons'

export function PixelIcon({ name, colour = '#213b32', size = 32, label }: {
  name: IconName
  colour?: string
  size?: number
  label?: string
}) {
  return (
    <img
      src={iconUrl(name, colour, 2)}
      width={size}
      height={size}
      alt={label ?? ''}
      aria-hidden={label ? undefined : true}
      draggable={false}
    />
  )
}

export function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`panel ${className}`.trim()}>{children}</section>
}

export function Banner({ title, left, right }: { title: string; left?: ReactNode; right?: ReactNode }) {
  return (
    <header className="banner">
      {left && <div className="banner-left">{left}</div>}
      <PixelIcon name="sprig" size={24} />
      <h1 className="banner-title">{title}</h1>
      <PixelIcon name="sprig" size={24} />
      {right && <div className="banner-right">{right}</div>}
    </header>
  )
}

export function Segmented<T extends string>({ options, value, onChange, label }: {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
  label: string
}) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Chip({ children, active, onClick, tone, tour }: {
  children: ReactNode
  active: boolean
  onClick: () => void
  tone?: 'coral'
  /** `data-tour` id, so a tour with Dot can point at it. */
  tour?: string
}) {
  return (
    <button type="button" className={`chip ${tone ?? ''}`.trim()} aria-pressed={active} onClick={onClick} data-tour={tour}>
      {children}
    </button>
  )
}

export function Pill({ children, tone }: { children: ReactNode; tone?: 'good' | 'demo' | 'warn' }) {
  return <span className={`pill ${tone ?? ''}`.trim()}>{children}</span>
}

export function DemoStamp() {
  return <Pill tone="demo">Demo data</Pill>
}

/** Marks the made-up eBird history so nobody mistakes it for real sightings. */
export function SampleStamp({ children = 'Sample history' }: { children?: ReactNode }) {
  return <Pill tone="demo">{children}</Pill>
}

export function BottomSheet({ open, onClose, title, children }: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
  if (!open) return null
  return (
    <>
      <div className="sheet-backdrop" onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title}>
        <button type="button" className="sheet-handle" aria-label="Close" onClick={onClose} />
        {children}
      </div>
    </>
  )
}
