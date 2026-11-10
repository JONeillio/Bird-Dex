#!/usr/bin/env node
// Phone-size screenshots of the built app, for checking UI work in the sandbox (Joseph's phone is ~412 px wide).
// Usage: npm run build && npm run screens -- "#/dex" "#/map >> click:Find a bird >> type:input[type=search]|gr"
// Steps after a route, separated by " >> ":
//   click:<text>              click the first button/link/chip whose text (or else aria-label) contains <text>
//   type:<css selector>|<text> type into an input
//   upload:<css selector>|<path> attach a file to a file input (path relative to the repo root)
//   scroll:<text>             scroll the first heading containing <text> into view
//   wait:<ms>                 wait
// WIDTH=360 npm run screens -- ... checks the narrowest phones. TOUR=1 lets Pearl's welcome tour start by itself.
// Saves /tmp/screens/NN.png (one per argument) and prints page errors. Exit code 1 if any page error.
// Map tiles can't load in the sandbox: the map shows plain grass with demo data. That is expected.
import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import puppeteer from 'puppeteer-core'

const CHROME = process.env.CHROME_PATH ?? '/usr/bin/google-chrome'
const PORT = 4179
const OUT = '/tmp/screens'
const shots = process.argv.slice(2)
if (shots.length === 0) {
  console.error('Give at least one route, e.g. "#/dex"')
  process.exit(2)
}
mkdirSync(OUT, { recursive: true })

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let errors = 0
try {
  for (let i = 0; i < 40; i++) {
    try {
      const r = await fetch(`http://localhost:${PORT}/Bird-Dex/`)
      if (r.ok) break
    } catch {
      /* not up yet */
    }
    await sleep(250)
  }
  const browser = await puppeteer.launch({ executablePath: CHROME, args: ['--no-sandbox'] })
  for (const [n, spec] of shots.entries()) {
    const [route, ...steps] = spec.split(' >> ')
    const page = await browser.newPage()
    await page.setViewport({ width: Number(process.env.WIDTH ?? 412), height: 860, deviceScaleFactor: 2 })
    // Pearl's welcome tour starts by itself on a fresh phone and would cover every screenshot. TOUR=1 keeps it.
    if (!process.env.TOUR)
      await page.evaluateOnNewDocument(() => {
        try {
          const p = JSON.parse(localStorage.getItem('bq.prefs') || '{}')
          localStorage.setItem('bq.prefs', JSON.stringify({ ...p, areaV2: true, toursDone: [...new Set([...(p.toursDone || []), 'welcome'])] }))
        } catch {
          /* ignore */
        }
      })
    page.on('pageerror', (e) => {
      errors++
      console.log(`  page error (${route}): ${e.message}`)
    })
    await page.goto(`http://localhost:${PORT}/Bird-Dex/${route}`, { waitUntil: 'networkidle2', timeout: 20000 }).catch(() => {})
    await sleep(1500)
    for (const step of steps) {
      const [kind, ...rest] = step.split(':')
      const arg = rest.join(':')
      if (kind === 'click') {
        const ok = await page.evaluate((t) => {
          const all = [...document.querySelectorAll('button, a, [role=button]')]
          const el = all.find((e) => e.textContent?.includes(t)) ?? all.find((e) => e.getAttribute('aria-label')?.includes(t))
          if (el) (el).click()
          return !!el
        }, arg)
        if (!ok) console.log(`  step failed: nothing to click with text "${arg}"`)
      } else if (kind === 'type') {
        const bar = arg.lastIndexOf('|')
        await page.type(arg.slice(0, bar), arg.slice(bar + 1)).catch(() => console.log(`  step failed: ${step}`))
      } else if (kind === 'upload') {
        const bar = arg.lastIndexOf('|')
        const input = await page.$(arg.slice(0, bar))
        if (input) await input.uploadFile(arg.slice(bar + 1))
        else console.log(`  step failed: ${step}`)
      } else if (kind === 'scroll') {
        await page.evaluate((t) => [...document.querySelectorAll('h1,h2,h3')].find((e) => e.textContent?.includes(t))?.scrollIntoView(), arg)
      } else if (kind === 'wait') {
        await sleep(Number(arg) || 500)
      }
      await sleep(400)
    }
    const file = `${OUT}/${String(n + 1).padStart(2, '0')}.png`
    await page.screenshot({ path: file })
    console.log(`${file}  ${spec}`)
    await page.close()
  }
  await browser.close()
} finally {
  server.kill()
}
process.exit(errors ? 1 : 0)
