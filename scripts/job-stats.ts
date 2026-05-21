/**
 * Show extraction attempt stats from the `jobs` table.
 *   npx tsx scripts/job-stats.ts [hours=24]
 */
import { config } from 'dotenv'
config({ path: '.env.local' })

import { supabaseAdmin } from '../lib/supabase-server'

async function main() {
  const hours = parseInt(process.argv[2] ?? '24', 10)
  const since = new Date(Date.now() - hours * 3600_000).toISOString()
  const sb = supabaseAdmin()

  const { data, error } = await sb
    .from('jobs')
    .select('id, url, status, error, created_at, user_ip')
    .gte('created_at', since)
    .order('created_at', { ascending: false })

  if (error) {
    console.error(error)
    process.exit(1)
  }
  const jobs = data ?? []

  const byStatus = new Map<string, number>()
  for (const j of jobs) byStatus.set(j.status, (byStatus.get(j.status) ?? 0) + 1)

  console.log(`\nExtraction attempts in last ${hours}h: ${jobs.length}\n`)
  for (const [s, n] of byStatus) {
    const pct = ((n / jobs.length) * 100).toFixed(1)
    console.log(`  ${s.padEnd(10)}  ${String(n).padStart(4)}  ${pct}%`)
  }
  console.log()

  const failed = jobs.filter((j) => j.status === 'failed')
  if (failed.length > 0) {
    console.log(`--- last ${Math.min(failed.length, 10)} failures ---`)
    for (const j of failed.slice(0, 10)) {
      console.log(`  ${j.created_at}  ${j.url}`)
      console.log(`    ${(j.error ?? '').slice(0, 200)}`)
    }
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
