// Small fetch helper for the pipeline and probes.
// Rules: never print keys, never write raw provider payloads to disk.
import { mkdirSync, writeFileSync, appendFileSync } from 'node:fs'

const SECRETS = () =>
  [process.env.EBIRD_API_KEY, process.env.ORS_API_KEY].filter((s): s is string => !!s && s.length > 3)

/** Remove any secret value from text before it is logged or saved. */
export function redact(text: string): string {
  let out = text
  for (const s of SECRETS()) out = out.split(s).join('[redacted]')
  return out
}

export interface Timed {
  ok: boolean
  status: number
  ms: number
  bytes: number
  headers: Record<string, string>
  json?: unknown
  error?: string
}

/** Header names worth reporting (limits, caching, CORS). Values only, never auth headers. */
const KEEP = /^(x-ratelimit|retry-after|cache-control|access-control-allow-origin|content-type|content-length|etag|age|cf-cache-status)/i

export async function timedFetch(url: string, init: RequestInit = {}, parse: 'json' | 'bytes' = 'json'): Promise<Timed> {
  const t0 = Date.now()
  try {
    const res = await fetch(url, { ...init, signal: AbortSignal.timeout(30_000) })
    const headers: Record<string, string> = {}
    res.headers.forEach((v, k) => {
      if (KEEP.test(k)) headers[k.toLowerCase()] = redact(v)
    })
    const buf = new Uint8Array(await res.arrayBuffer())
    let json: unknown
    if (parse === 'json' && res.ok) {
      try {
        json = JSON.parse(new TextDecoder().decode(buf))
      } catch {
        return { ok: false, status: res.status, ms: Date.now() - t0, bytes: buf.length, headers, error: 'response was not JSON' }
      }
    }
    return { ok: res.ok, status: res.status, ms: Date.now() - t0, bytes: buf.length, headers, json }
  } catch (e) {
    return { ok: false, status: 0, ms: Date.now() - t0, bytes: 0, headers: {}, error: redact(e instanceof Error ? e.message : String(e)) }
  }
}

/** Write a summary-only report as JSON and Markdown, and append to the job summary if present. */
export function writeReport(name: string, data: unknown, markdown: string): void {
  mkdirSync('reports', { recursive: true })
  writeFileSync(`reports/${name}.json`, redact(JSON.stringify(data, null, 2)))
  writeFileSync(`reports/${name}.md`, redact(markdown))
  const summary = process.env.GITHUB_STEP_SUMMARY
  if (summary) appendFileSync(summary, redact(markdown) + '\n')
  console.log(redact(markdown))
}

/** Names of the keys of the first object in an array (field names only, no values). */
export function fieldNames(x: unknown): string[] {
  if (Array.isArray(x) && x[0] && typeof x[0] === 'object') return Object.keys(x[0] as object).sort()
  return []
}
