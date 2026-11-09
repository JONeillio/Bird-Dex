import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { DOT_ART, DOT_AVATAR, DOT_POSES, DOT_SKETCH } from '../src/art/dot'
import { TOURS } from '../src/data/tours'
import { EXHIBIT_ART } from '../src/features/tour/exhibits'
import { routeMatches, unionBox } from '../src/features/tour/spotlight'
import { DEFAULT_PREFS } from '../src/state/store'
import { shouldAutoStart } from '../src/state/tour'
import { BODY, METRICS, MOTION, fillTokens, glyphFor, layoutPages, letterPhase, measure, pageDuration, resolveText, scheduleLetters, unsupportedChars } from '../src/ui/fieldhand/layout'

const MAX = BODY.w - 30

function pngSize(file: string): [number, number] {
  const b = readFileSync(file)
  return [b.readUInt32BE(16), b.readUInt32BE(20)]
}
const publicPath = (src: string) => join('public', src.replace(/^\/(Bird-Dex\/)?/, ''))

describe('Fieldhand layout', () => {
  it('covers the kit’s 106 characters and falls back to ? for others', () => {
    expect(Object.keys(METRICS.glyphs)).toHaveLength(106)
    expect(glyphFor('ж')).toEqual(METRICS.glyphs['?'])
    expect(unsupportedChars('Café £3 — “ok”…')).toEqual([])
    expect(unsupportedChars('ok 🐦 ж')).toEqual(['🐦', 'ж'])
  })
  it('wraps whole words inside the bubble and pages every four lines', () => {
    const text = 'Round body. Tail up. Feet can wait. '.repeat(8)
    const pages = layoutPages(text)
    expect(pages.length).toBeGreaterThan(1)
    for (const p of pages) {
      expect(p.length).toBeLessThanOrEqual(4)
      for (const line of p) expect(measure(line)).toBeLessThanOrEqual(MAX)
    }
    expect(pages.flat().join(' ').replace(/\s+/g, ' ').trim()).toBe(text.trim())
  })
  it('breaks a word longer than a line and honours line breaks', () => {
    const long = 'x'.repeat(80)
    const pages = layoutPages(long)
    expect(pages[0].length).toBeGreaterThan(1)
    expect(layoutPages('One\nTwo')[0]).toEqual(['One', 'Two'])
  })
  it('lets letters fall in order, pauses at punctuation, and skips spaces', () => {
    const ls = scheduleLetters(['Hi, you.'])
    expect(ls.map((l) => l.ch).join('')).toBe('Hi,you.')
    for (let i = 1; i < ls.length; i++) expect(ls[i].t).toBeGreaterThan(ls[i - 1].t)
    const comma = ls.findIndex((l) => l.ch === ',')
    expect(ls[comma + 1].t - ls[comma].t).toBe(METRICS.letterMs + MOTION.commaMs + MOTION.spaceMs)
    expect(pageDuration(ls)).toBe(ls[ls.length - 1].t + MOTION.fallMs + METRICS.landingMs)
  })
  it('drops each letter from above, lands it tilted, then stamps it upright', () => {
    const l = { ch: 'a', x: 0, y: 0, t: 100 }
    expect(letterPhase(l, 50)).toEqual({ state: 'waiting' })
    expect(letterPhase(l, 100)).toEqual({ state: 'falling', dy: MOTION.fallPx })
    const mid = letterPhase(l, 100 + MOTION.fallMs / 2)
    expect(mid.state).toBe('falling')
    if (mid.state === 'falling') expect(mid.dy).toBeLessThan(MOTION.fallPx)
    expect(letterPhase(l, 100 + MOTION.fallMs)).toEqual({ state: 'landed' })
    expect(letterPhase(l, 100 + MOTION.fallMs + METRICS.landingMs)).toEqual({ state: 'locked' })
  })
  it('fills live facts and uses the fallback when one is missing', () => {
    expect(fillTokens('{a} and {b}', { a: 'x', b: 2 })).toBe('x and 2')
    expect(fillTokens('{a} and {b}', { a: 'x', b: null })).toBeNull()
    expect(resolveText('Hi {name}.', 'Hello.', {})).toBe('Hello.')
    expect(resolveText('Hi {name}.', undefined, {})).toBe('Hi .')
  })
})

describe('Dot art', () => {
  it('has every pose at 96x96, the head icon at 32x32 and two sketch cels', () => {
    for (const p of DOT_POSES) {
      expect(pngSize(publicPath(DOT_ART[p].src))).toEqual([96, 96])
      const [mx, my] = DOT_ART[p].mouth
      expect(mx).toBeGreaterThan(0)
      expect(my).toBeLessThan(96)
    }
    expect(pngSize(publicPath(DOT_AVATAR.src))).toEqual([32, 32])
    expect(pngSize(publicPath(DOT_SKETCH.src))).toEqual([192, 96])
    for (const f of ['fieldhand-land', 'fieldhand-lock', 'bubble-paper-9slice', 'bubble-lifer-9slice']) expect(existsSync(`public/assets/ui/fieldhand/${f}.png`)).toBe(true)
    expect(pngSize('public/assets/ui/fieldhand/bubble-paper-9slice.png')).toEqual([28, 28])
  })
  it('exhibits point at art that exists', () => {
    for (const a of Object.values(EXHIBIT_ART)) expect(existsSync(publicPath(a.src))).toBe(true)
  })
})

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f)
    return statSync(p).isDirectory() ? sourceFiles(p) : p.endsWith('.tsx') ? [p] : []
  })
}

describe('tour scripts', () => {
  const src = sourceFiles('src').map((f) => readFileSync(f, 'utf8')).join('\n')
  const tabs = [...src.matchAll(/\{ name: '(\w+)', label: '[^']+', icon:/g)].map((m) => `tab-${m[1]}`)
  const ids = new Set([...src.matchAll(/(?:data-tour|tour)="([a-z0-9-]+)"/g)].map((m) => m[1]).concat(tabs))
  // Long but realistic values, so a line that fits here fits on a phone.
  const facts = { siteName: 'Rainham Marshes', bird: 'Great Crested Grebe', when: '12 days ago', minutes: 48, newCount: 23, recorded: 104, dexSize: 104 }
  const known = new Set(Object.keys(facts))

  for (const [id, tour] of Object.entries(TOURS)) {
    it(`${id}: every spotlight target exists in the app`, () => {
      for (const s of tour.steps) if (s.target) expect(ids, `${s.id} → ${s.target}`).toContain(s.target)
    })
    it(`${id}: every line can be drawn, fits one bubble, and has a fallback for live values`, () => {
      for (const s of tour.steps)
        for (const l of s.lines) {
          for (const t of [l.text, l.fallback].filter((x): x is string => !!x)) {
            expect(unsupportedChars(t), `${s.id}: ${t}`).toEqual([])
            const tokens = [...t.matchAll(/\{(\w+)\}/g)].map((m) => m[1])
            for (const k of tokens) expect(known, `${s.id}: {${k}}`).toContain(k)
            expect(layoutPages(fillTokens(t, facts)!).length, `${s.id}: ${t}`).toBe(1)
          }
          if (/\{\w+\}/.test(l.text)) expect(l.fallback, `${s.id} needs a fallback`).toBeTruthy()
          if (l.fallback) expect(l.fallback).not.toMatch(/\{\w+\}/)
        }
    })
  }
  it('the welcome tour opens with a way to say no, and ends with a goodbye', () => {
    const w = TOURS.welcome
    expect(w.auto).toBe(true)
    expect(w.steps[0].choices?.map((c) => c.id)).toEqual(['next', 'later', 'never'])
    expect(w.steps.at(-1)!.choices?.map((c) => c.id)).toEqual(['finish'])
  })
})

describe('starting the tour', () => {
  it('starts on a first visit, but not once finished, turned down, snoozed, or on dev and settings pages', () => {
    expect(DEFAULT_PREFS.toursDone).toEqual([])
    expect(shouldAutoStart('welcome', [], false, 'map')).toBe(true)
    expect(shouldAutoStart('welcome', ['welcome'], false, 'map')).toBe(false)
    expect(shouldAutoStart('welcome', [], true, 'map')).toBe(false)
    expect(shouldAutoStart('welcome', [], false, 'dev')).toBe(false)
    expect(shouldAutoStart('welcome', [], false, 'settings')).toBe(false)
    expect(shouldAutoStart('nope', [], false, 'map')).toBe(false)
  })
  it('matches routes the way the router does', () => {
    expect(routeMatches('', '#/map')).toBe(true)
    expect(routeMatches('#/', '#/map')).toBe(true)
    expect(routeMatches('#/dex', '#/dex')).toBe(true)
    expect(routeMatches('#/dex', '#/journal')).toBe(false)
  })
  it('draws one spotlight round several elements, clipped to the screen', () => {
    const r = (left: number, top: number, w: number, h: number) => ({ left, top, right: left + w, bottom: top + h, width: w, height: h })
    expect(unionBox([r(10, 10, 50, 30), r(70, 12, 50, 30)], 400, 800)).toEqual({ x: 10, y: 10, w: 110, h: 32 })
    expect(unionBox([r(380, 10, 50, 30)], 400, 800)).toEqual({ x: 380, y: 10, w: 20, h: 30 })
    expect(unionBox([r(0, 0, 0, 0)], 400, 800)).toBeNull()
  })
})
