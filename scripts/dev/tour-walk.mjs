// Walks Dot's whole welcome tour on a fresh phone and saves a screenshot per beat to /tmp/tour/ (run after npm run build).
// node scripts/dev/tour-walk.mjs   ·   WIDTH=360 node scripts/dev/tour-walk.mjs
import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import puppeteer from 'puppeteer-core'
mkdirSync('/tmp/tour', { recursive: true })
const W = Number(process.env.WIDTH ?? 412)
const server = spawn('npx', ['vite', 'preview', '--port', '4181', '--strictPort'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
await sleep(2500)
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] })
const p = await b.newPage()
p.on('pageerror', (e) => console.log('PAGE ERROR', e.message))
await p.setViewport({ width: W, height: 860, deviceScaleFactor: 2 })
await p.goto('http://localhost:4181/Bird-Dex/', { waitUntil: 'networkidle2' })
await sleep(2500)
let n = 0
const shot = async (tag) => { await sleep(700); await p.screenshot({ path: `/tmp/tour/${String(n++).padStart(2, '0')}-${tag}.png` }) }
const finishAll = async () => { for (let k = 0; k < 8; k++) { const t = await p.evaluate(() => document.querySelector('.tour-speech')?.getAttribute('aria-label')); if (t !== 'Show the whole line') break; await p.click('.tour-speech'); await sleep(150) } }
await shot('hello-typing')
for (let i = 0; i < 80; i++) {
  await finishAll()
  const state = await p.evaluate(() => ({ choices: [...document.querySelectorAll('.dlg-choice')].map((e) => e.textContent), bar: document.querySelector('.tour-bar .muted')?.textContent, hash: location.hash, tour: !!document.querySelector('.tour') }))
  if (!state.tour) { console.log('tour closed'); await shot('end'); break }
  console.log(i, state.hash, state.bar, state.choices.join('/'))
  await shot(`s${i}`)
  if (state.choices.length) { await p.evaluate(() => document.querySelector('.dlg-choice').click()); await sleep(900); continue }
  if (state.bar?.includes('Tap View')) { await p.evaluate(() => document.querySelector('[data-tour=site-view]')?.click()); await sleep(1200); continue }
  await p.evaluate(() => [...document.querySelectorAll('.tour-bar button')].find((e) => e.textContent.includes('Next')).click())
  await sleep(900)
}
await b.close(); server.kill()
