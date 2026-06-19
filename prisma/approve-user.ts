/**
 * Approve a pending user on TheOneWayGDA
 *
 * Usage:
 *   node prisma/approve-user.ts <email>
 *   node prisma/approve-user.ts <email> --admin      # also promote to admin
 *   node prisma/approve-user.ts --all                 # approve ALL pending users
 *   node prisma/approve-user.ts --list                # list all pending users
 *
 * Examples:
 *   node prisma/approve-user.ts user@example.com
 *   node prisma/approve-user.ts user@example.com --admin
 *   node prisma/approve-user.ts --all
 *   node prisma/approve-user.ts --list
 */
import { config } from 'dotenv'
config({ override: true })

import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

async function listPending() {
  const users = await db.user.findMany({
    where: { role: 'pending' },
    select: { id: true, email: true, name: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  })

  if (users.length === 0) {
    console.log('\n  No pending users found.\n')
    return
  }

  console.log(`\n  ┌─────────────────────────────────────────────────────────────┐`)
  console.log(`  │  Pending Users (${users.length})                                    │`)
  console.log(`  ├─────────────────────────────────────────────────────────────┤`)
  for (const u of users) {
    const name = u.name || '(no name)'
    const date = u.createdAt.toISOString().slice(0, 19).replace('T', ' ')
    console.log(`  │  ${u.email.padEnd(35)} ${name.padEnd(15)} ${date}  │`)
  }
  console.log(`  └─────────────────────────────────────────────────────────────┘\n`)
}

async function approveUser(email: string, makeAdmin: boolean) {
  const normalizedEmail = email.toLowerCase().trim()

  console.log(`\n▸ Looking up user: ${normalizedEmail}`)

  const user = await db.user.findUnique({ where: { email: normalizedEmail } })

  if (!user) {
    console.log(`  ❌ No user found with email: ${normalizedEmail}`)
    console.log(`  💡 Tip: Run "node prisma/approve-user.ts --list" to see all pending users\n`)
    process.exit(1)
  }

  console.log(`  Found user: ${user.name || '(no name)'} [${user.id}]`)
  console.log(`  Current role: ${user.role}`)

  if (user.role === 'user') {
    console.log(`  ✅ User is already approved!\n`)
    process.exit(0)
  }

  if (user.role === 'admin') {
    console.log(`  ⚠️  User is already an admin!\n`)
    process.exit(0)
  }

  const newRole = makeAdmin ? 'admin' : 'user'

  // Update user role
  const updated = await db.user.update({
    where: { email: normalizedEmail },
    data: {
      role: newRole,
      isOnboarded: true,
    },
  })

  // Update visitor record
  await db.visitor.upsert({
    where: { email: normalizedEmail },
    update: { status: 'accepted' },
    create: { email: normalizedEmail, name: user.name, status: 'accepted' },
  })

  // Log activity
  await db.userActivity.create({
    data: {
      userId: user.id,
      type: 'account_approved',
      details: JSON.stringify({ approvedBy: 'script', method: 'approve-user.ts' }),
    },
  })

  console.log(`\n  ✅ User approved successfully!`)
  console.log(`     Email:   ${updated.email}`)
  console.log(`     Name:    ${updated.name || '(not set)'}`)
  console.log(`     Role:    ${newRole}`)
  console.log(`     Status:  accepted`)
  console.log(`\n  → The user can now log in at /auth/login\n`)
}

async function approveAll() {
  console.log(`\n▸ Finding all pending users...`)

  const pendingUsers = await db.user.findMany({
    where: { role: 'pending' },
    select: { id: true, email: true, name: true },
  })

  if (pendingUsers.length === 0) {
    console.log('  No pending users found.\n')
    return
  }

  console.log(`  Found ${pendingUsers.length} pending user(s)\n`)

  let approved = 0
  for (const u of pendingUsers) {
    await db.user.update({
      where: { id: u.id },
      data: { role: 'user', isOnboarded: true },
    })
    await db.visitor.upsert({
      where: { email: u.email },
      update: { status: 'accepted' },
      create: { email: u.email, name: u.name, status: 'accepted' },
    })
    await db.userActivity.create({
      data: {
        userId: u.id,
        type: 'account_approved',
        details: JSON.stringify({ approvedBy: 'script', method: 'approve-user.ts --all' }),
      },
    })
    console.log(`  ✅ ${u.email} — approved`)
    approved++
  }

  console.log(`\n  ${approved} user(s) approved.\n`)
}

// ── Main ──

const args = process.argv.slice(2)

if (args.includes('--list')) {
  listPending()
    .catch((e) => { console.error('Failed:', e); process.exit(1) })
    .finally(() => db.$disconnect())
} else if (args.includes('--all')) {
  approveAll()
    .catch((e) => { console.error('Failed:', e); process.exit(1) })
    .finally(() => db.$disconnect())
} else if (args[0] && !args[0].startsWith('--')) {
  const email = args[0]
  const makeAdmin = args.includes('--admin')
  approveUser(email, makeAdmin)
    .catch((e) => { console.error('Failed:', e); process.exit(1) })
    .finally(() => db.$disconnect())
} else {
  console.log(`
  Usage: node prisma/approve-user.ts <email> [--admin] [--all] [--list]

  Commands:
    <email>          Approve a specific pending user by email
    <email> --admin  Approve and promote to admin
    --all            Approve ALL pending users
    --list           List all pending users

  Examples:
    node prisma/approve-user.ts user@example.com
    node prisma/approve-user.ts user@example.com --admin
    node prisma/approve-user.ts --all
    node prisma/approve-user.ts --list
`)
  process.exit(0)
}