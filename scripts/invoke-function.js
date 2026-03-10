import { readFileSync } from 'fs'
import { resolve } from 'path'

// Load .env
const envPath = resolve(process.cwd(), '.env')
const envContent = readFileSync(envPath, 'utf-8')
const env = {}
for (const line of envContent.split('\n')) {
  if (line && !line.startsWith('#')) {
    const [key, ...valueParts] = line.split('=')
    if (key && valueParts.length > 0) {
      env[key.trim()] = valueParts.join('=').trim()
    }
  }
}

const functionName = process.argv[2]
if (!functionName) {
  console.error('Usage: node scripts/invoke-function.js <function-name>')
  console.error('Available: collect-sentry, collect-github, collect-dependabot, collect-debugbear, collect-coverage')
  process.exit(1)
}

const url = `${env.SUPABASE_URL}/functions/v1/${functionName}`
const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SECRET_KEY

if (!env.SUPABASE_URL || !key) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY/SUPABASE_SECRET_KEY in .env')
  process.exit(1)
}

console.log(`Invoking ${functionName}...`)
console.log(`URL: ${url}`)

try {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json'
    }
  })

  const text = await response.text()
  let data
  try {
    data = JSON.parse(text)
  } catch {
    data = text
  }

  console.log(`Status: ${response.status}`)
  console.log('Response:', JSON.stringify(data, null, 2))

  if (!response.ok) {
    process.exit(1)
  }
} catch (error) {
  console.error('Error:', error.message)
  process.exit(1)
}
