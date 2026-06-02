/**
 * Seed an admin user into the database.
 * Run: npx tsx prisma/seed-admin.ts
 *
 * This creates an admin account for the /admin/approvals dashboard (Method 2).
 * You can then log in at /auth/login with these credentials.
 */
import { PrismaClient } from '@prisma/client'
import { hashPassword, generateToken } from '../src/lib/auth'

const db = new PrismaClient()

async function main() {
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'msad41855@gmail.com'
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@123456'

  console.log(`\n▸ Seeding admin user: ${ADMIN_EMAIL}`)

  // Upsert admin user
  const user = await db.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {
      role: 'admin',
      isOnboarded: true,
    },
    create: {
      email: ADMIN_EMAIL,
      name: 'Admin',
      password: hashPassword(ADMIN_PASSWORD),
      role: 'admin',
      isOnboarded: true,
      preferences: JSON.stringify({
        theme: 'dark',
        language: 'en',
        notifications: true,
      }),
    },
  })

  // Create a long-lived session (30 days)
  const token = generateToken()
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 30)

  // Delete any existing sessions for this user first
  await db.userSession.deleteMany({ where: { userId: user.id } })

  await db.userSession.create({
    data: {
      userId: user.id,
      token,
      expiresAt,
    },
  })

  // Also upsert visitor record as accepted
  await db.visitor.upsert({
    where: { email: ADMIN_EMAIL },
    update: { name: 'Admin', status: 'accepted', visitorType: 'developer' },
    create: { email: ADMIN_EMAIL, name: 'Admin', status: 'accepted', visitorType: 'developer' },
  })

  console.log(`\n✅ Admin user created successfully!`)
  console.log(`\n   Email:    ${ADMIN_EMAIL}`)
  console.log(`   Password: ${ADMIN_PASSWORD}`)
  console.log(`   Token:    ${token}`)
  console.log(`\n   ┌──────────────────────────────────────────────────────┐`)
  console.log(`   │  How to use:                                        │`)
  console.log(`   │                                                      │`)
  console.log(`   │  Method 2: /admin/approvals                          │`)
  console.log(`   │    1. Go to /auth/login                              │`)
  console.log(`   │    2. Login with the email + password above          │`)
  console.log(`   │    3. Visit /admin/approvals to manage users          │`)
  console.log(`   │                                                      │`)
  console.log(`   │  Method 3: /admin/visitors                            │`)
  console.log(`   │    1. Set ADMIN_SECRET in your .env                   │`)
  console.log(`   │    2. Go to /admin/visitors                          │`)
  console.log(`   │    3. Login with ADMIN_SECRET password               │`)
  console.log(`   │                                                      │`)
  console.log(`   │  Method 1: Email One-Click                           │`)
  console.log(`   │    1. Set ADMIN_EMAIL_APP_PASSWORD in .env           │`)
  console.log(`   │    2. Emails auto-send on new registration           │`)
  console.log(`   │    3. Click Approve/Reject in the email              │`)
  console.log(`   └──────────────────────────────────────────────────────┘\n`)
}

main()
  .catch((e) => {
    console.error('Seed failed:', e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
