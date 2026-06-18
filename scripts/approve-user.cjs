/**
 * Approve users on TheOneWayGDA — uses Node.js built-in SQLite (no Prisma needed)
 *
 * Usage:
 *   node scripts/approve-user.cjs <email>            # approve a specific user
 *   node scripts/approve-user.cjs <email> --admin    # approve + make admin
 *   node scripts/approve-user.cjs --all              # approve ALL pending
 *   node scripts/approve-user.cjs --list             # list pending users/visitors
 *   node scripts/approve-user.cjs --status           # show all users & their status
 *
 * Examples:
 *   node scripts/approve-user.cjs user@example.com
 *   node scripts/approve-user.cjs user@example.com --admin
 *   node scripts/approve-user.cjs --all
 *   node scripts/approve-user.cjs --list
 */
'use strict'

const { DatabaseSync } = require('node:sqlite')
const path = require('path')

// Find the database — reads from .env or falls back to default
require('dotenv').config({ override: true })
const DB_PATH = (process.env.DATABASE_URL || 'file:./db/custom.db').replace(/^file:/, '')
const RESOLVED_DB = path.resolve(process.cwd(), DB_PATH)

function getDb() {
  try {
    return new DatabaseSync(RESOLVED_DB)
  } catch (e) {
    console.error(`\n  Cannot open database: ${RESOLVED_DB}`)
    console.error(`  Error: ${e.message}\n`)
    process.exit(1)
  }
}

function listPending() {
  const db = getDb()

  // Check User table
  const pendingUsers = db.prepare("SELECT id, email, name, role FROM User WHERE role = 'pending'").all()
  // Check Visitor table
  const pendingVisitors = db.prepare("SELECT id, email, name, status, visitorType FROM Visitor WHERE status = 'pending'").all()

  if (pendingUsers.length === 0 && pendingVisitors.length === 0) {
    console.log('\n  No pending users or visitors found.\n')
    db.close()
    return
  }

  if (pendingUsers.length > 0) {
    console.log(`\n  Pending Users (${pendingUsers.length}):`)
    console.log('  ' + '─'.repeat(70))
    for (const u of pendingUsers) {
      console.log(`    ${u.email.padEnd(35)} ${(u.name || '(no name)').padEnd(15)} ${u.id}`)
    }
  }

  if (pendingVisitors.length > 0) {
    console.log(`\n  Pending Visitors (${pendingVisitors.length}):`)
    console.log('  ' + '─'.repeat(70))
    for (const v of pendingVisitors) {
      console.log(`    ${v.email.padEnd(35)} ${(v.name || '(no name)').padEnd(15)} ${v.visitorType || '-'}`)
    }
  }

  console.log('')
  db.close()
}

function showStatus() {
  const db = getDb()

  const users = db.prepare('SELECT email, name, role FROM User').all()
  const visitors = db.prepare('SELECT email, name, status, visitorType FROM Visitor').all()

  console.log(`\n  ═══ Users (${users.length}) ═══`)
  if (users.length === 0) {
    console.log('    (none)')
  } else {
    for (const u of users) {
      const icon = u.role === 'admin' ? '👑' : u.role === 'user' ? '✅' : u.role === 'pending' ? '⏳' : '❌'
      console.log(`    ${icon} ${(u.role || '?').padEnd(10)} ${u.email.padEnd(35)} ${u.name || '(no name)'}`)
    }
  }

  console.log(`\n  ═══ Visitors (${visitors.length}) ═══`)
  if (visitors.length === 0) {
    console.log('    (none)')
  } else {
    for (const v of visitors) {
      const icon = v.status === 'accepted' ? '✅' : v.status === 'pending' ? '⏳' : '❌'
      console.log(`    ${icon} ${(v.status || '?').padEnd(10)} ${v.email.padEnd(35)} ${(v.name || '(no name)').padEnd(15)} ${v.visitorType || '-'}`)
    }
  }

  console.log('')
  db.close()
}

function approveUser(email, makeAdmin) {
  const db = getDb()
  const normalizedEmail = email.toLowerCase().trim()

  console.log(`\n▸ Approving: ${normalizedEmail}`)

  let found = false

  // 1. Update User table if record exists
  try {
    const user = db.prepare('SELECT id, email, name, role FROM User WHERE email = ?').get(normalizedEmail)
    if (user) {
      found = true
      console.log(`  User found: ${user.name || '(no name)'} [role: ${user.role}]`)

      if (user.role === 'user') {
        console.log('  Already approved.')
      } else if (user.role === 'admin') {
        console.log('  Already an admin.')
      } else {
        const newRole = makeAdmin ? 'admin' : 'user'
        db.prepare('UPDATE User SET role = ?, isOnboarded = 1 WHERE email = ?').run(newRole, normalizedEmail)
        console.log(`  User role updated to: ${newRole}`)
      }
    }
  } catch (e) {
    // User table might not have the expected columns
  }

  // 2. Update Visitor table if record exists
  try {
    const visitor = db.prepare('SELECT id, email, name, status FROM Visitor WHERE email = ?').get(normalizedEmail)
    if (visitor) {
      found = true
      console.log(`  Visitor found: ${visitor.name || '(no name)'} [status: ${visitor.status}]`)

      if (visitor.status !== 'accepted') {
        db.prepare("UPDATE Visitor SET status = 'accepted' WHERE email = ?").run(normalizedEmail)
        console.log('  Visitor status updated to: accepted')
      } else {
        console.log('  Visitor already accepted.')
      }
    }
  } catch (e) {
    // Visitor table might not exist
  }

  if (!found) {
    console.log(`  ❌ No record found for: ${normalizedEmail}`)
    console.log('  💡 Run "node scripts/approve-user.cjs --list" to see all pending users')
  } else {
    console.log(`\n  ✅ Done! The user can now access the platform.\n`)
  }

  db.close()
}

function approveAll() {
  const db = getDb()

  console.log('\n▸ Approving all pending users...\n')

  let count = 0

  // Approve pending Users
  try {
    const pending = db.prepare("SELECT email FROM User WHERE role = 'pending'").all()
    for (const u of pending) {
      db.prepare("UPDATE User SET role = 'user', isOnboarded = 1 WHERE email = ?").run(u.email)
      console.log(`  ✅ User approved: ${u.email}`)
      count++
    }
  } catch (e) {}

  // Accept pending Visitors
  try {
    const pending = db.prepare("SELECT email FROM Visitor WHERE status = 'pending'").all()
    for (const v of pending) {
      db.prepare("UPDATE Visitor SET status = 'accepted' WHERE email = ?").run(v.email)
      console.log(`  ✅ Visitor accepted: ${v.email}`)
      count++
    }
  } catch (e) {}

  if (count === 0) {
    console.log('  No pending records found.')
  } else {
    console.log(`\n  ${count} record(s) approved.\n`)
  }

  db.close()
}

// ── Main ──

const args = process.argv.slice(2)

if (args.includes('--status')) {
  showStatus()
} else if (args.includes('--list')) {
  listPending()
} else if (args.includes('--all')) {
  approveAll()
} else if (args[0] && !args[0].startsWith('--')) {
  const email = args[0]
  const makeAdmin = args.includes('--admin')
  approveUser(email, makeAdmin)
} else {
  console.log(`
  TheOneWayGDA — User Approval Tool

  Usage: node scripts/approve-user.cjs <command>

  Commands:
    <email>            Approve a specific user/visitor by email
    <email> --admin    Approve and promote to admin (User table only)
    --all              Approve ALL pending users and visitors
    --list             List all pending users and visitors
    --status           Show all users/visitors with their status

  Examples:
    node scripts/approve-user.cjs user@example.com
    node scripts/approve-user.cjs user@example.com --admin
    node scripts/approve-user.cjs --all
    node scripts/approve-user.cjs --list
    node scripts/approve-user.cjs --status
`)
}