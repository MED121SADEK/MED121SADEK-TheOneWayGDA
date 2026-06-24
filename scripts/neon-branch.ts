/**
 * Neon Database Branching Setup
 *
 * Creates a development branch from your Neon production database.
 * Dev branches are independent copies with their own data — perfect for
 * testing migrations, schema changes, and feature development.
 *
 * PREREQUISITE: Get your Neon API key from https://neon.tech/app/settings/api-keys
 *
 * Usage:
 *   NEON_API_KEY=your-key npm run db:branch:create    # Create dev branch
 *   npm run db:branch:ls                                # List branches
 *   npm run db:branch:delete                            # Delete dev branch
 *   npm run db:branch:reset                             # Reset dev branch data
 */

import { execSync } from 'child_process'

const NEON_PROJECT_ID = 'ep-silent-heart-asmo3jgi'
const DEV_BRANCH_NAME = 'dev'
const API_BASE = 'https://console.neon.tech/api/v2'

async function neonRequest(path: string, options: RequestInit = {}) {
  const apiKey = process.env.NEON_API_KEY
  if (!apiKey) {
    console.error('❌ NEON_API_KEY not set. Get one from https://neon.tech/app/settings/api-keys')
    process.exit(1)
  }

  const res = await fetch(`${API_BASE}/projects/${NEON_PROJECT_ID}${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!res.ok) {
    const body = await res.text()
    console.error(`❌ Neon API error ${res.status}: ${body}`)
    process.exit(1)
  }

  return res.json()
}

async function createDevBranch() {
  console.log(`🌿 Creating Neon dev branch "${DEV_BRANCH_NAME}"...`)

  // Check if branch already exists
  const existing = await neonRequest('/branches')
  const branch = existing.branches?.find((b: any) => b.name === DEV_BRANCH_NAME)

  if (branch) {
    console.log(`✅ Dev branch already exists`)
    console.log(`   Branch ID: ${branch.id}`)
    console.log(`   Host: ${branch.endpoints[0]?.host}`)
    printConnectionInfo(branch)
    return
  }

  // Create new branch from production
  const result = await neonRequest('/branches', {
    method: 'POST',
    body: JSON.stringify({
      name: DEV_BRANCH_NAME,
      source_branch_id: existing.branches?.find((b: any) => b.primary)?.id,
    }),
  })

  const newBranch = result.branch
  console.log(`✅ Dev branch "${DEV_BRANCH_NAME}" created!`)
  console.log(`   Branch ID: ${newBranch.id}`)
  console.log(`   State: ${newBranch.state}`)
  printConnectionInfo(newBranch)
}

async function listBranches() {
  const result = await neonRequest('/branches')

  console.log('🌿 Neon Branches:')
  console.log('─'.repeat(60))

  for (const branch of result.branches) {
    const primary = branch.primary ? ' (primary)' : ''
    const host = branch.endpoints[0]?.host || '?'
    console.log(`  ${branch.name}${primary}`)
    console.log(`    ID: ${branch.id}`)
    console.log(`    Host: ${host}`)
    console.log(`    State: ${branch.state}`)
    console.log('')
  }
}

async function deleteDevBranch() {
  console.log(`🗑️  Deleting dev branch "${DEV_BRANCH_NAME}"...`)

  const existing = await neonRequest('/branches')
  const branch = existing.branches?.find((b: any) => b.name === DEV_BRANCH_NAME)

  if (!branch) {
    console.log('ℹ️  Dev branch does not exist.')
    return
  }

  await neonRequest(`/branches/${branch.id}`, { method: 'DELETE' })
  console.log(`✅ Dev branch "${DEV_BRANCH_NAME}" deleted.`)
}

async function resetDevBranch() {
  console.log(`🔄 Resetting dev branch "${DEV_BRANCH_NAME}" data from production...`)

  const existing = await neonRequest('/branches')
  const branch = existing.branches?.find((b: any) => b.name === DEV_BRANCH_NAME)

  if (!branch) {
    console.log('❌ Dev branch does not exist. Run: npm run db:branch:create')
    return
  }

  await neonRequest(`/branches/${branch.id}/reset`, { method: 'POST' })
  console.log(`✅ Dev branch reset to match production data.`)
}

function printConnectionInfo(branch: any) {
  const host = branch.endpoints[0]?.host
  const user = 'neondb_owner'
  // Note: password is the same as production
  // The user should get it from their Neon dashboard
  console.log('')
  console.log('   Connection string (add to .env.local):')
  console.log(`   DATABASE_URL="postgresql://${user}:<your-password>@${host}/neondb?sslmode=require"`)
  console.log('')
  console.log('   💡 Get your password from https://neon.tech/app → your project → Connection Details')
}

// CLI
const command = process.argv[2]

switch (command) {
  case 'create':
    createDevBranch().catch(console.error)
    break
  case 'ls':
    listBranches().catch(console.error)
    break
  case 'delete':
    deleteDevBranch().catch(console.error)
    break
  case 'reset':
    resetDevBranch().catch(console.error)
    break
  default:
    console.log(`
Neon Database Branching

Commands:
  npm run db:branch:create    Create dev branch from production
  npm run db:branch:ls        List all branches
  npm run db:branch:delete    Delete dev branch
  npm run db:branch:reset     Reset dev branch to match production

Setup:
  1. Get your Neon API key: https://neon.tech/app/settings/api-keys
  2. Run: NEON_API_KEY=nps_xxx npm run db:branch:create
  3. Copy the connection string to your .env.local
`)
    process.exit(0)
}