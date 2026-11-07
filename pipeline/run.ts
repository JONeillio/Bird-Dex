// Data pipeline entry point. Placeholder until M5: demo data is copied by the workflow.
// Usage: tsx pipeline/run.ts --task=deploy|refresh
const task = process.argv.find((a) => a.startsWith('--task='))?.split('=')[1] ?? 'deploy'
console.log(`pipeline: task=${task}. No live data pipeline yet (arrives in M5); the site uses demo data.`)
