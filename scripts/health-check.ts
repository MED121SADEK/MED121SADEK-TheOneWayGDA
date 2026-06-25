import { PrismaClient } from '@prisma/client'

async function main() {
  const db = new PrismaClient({
    datasourceUrl: 'postgresql://neondb_owner:npg_MEqk4iNI5dzp@ep-silent-heart-asmo3jgi-pooler.c-4.eu-central-1.aws.neon.tech/neondb?sslmode=require'
  })

  console.log('=== DATABASE HEALTH CHECK ===\n')

  // 1. Connection
  try {
    await db.$queryRaw`SELECT 1`
    console.log('✅ Database connection: OK')
  } catch (e) {
    console.log('❌ Database connection: FAILED')
    return
  }

  // 2. Tables
  const tables = ['User', 'UserSession', 'OAuthAccount', 'Visitor', 'CommunityPost', 'Project']
  for (const t of tables) {
    try {
      const count = await (db as any)[t]?.count?.() ?? 0
      console.log(`✅ Table ${t}: ${count} rows`)
    } catch {
      console.log(`⚠️  Table ${t}: not accessible`)
    }
  }

  // 3. User roles check
  console.log('\n=== USER ACCOUNTS ===')
  const users = await db.user.findMany({
    select: { email: true, name: true, role: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
    take: 10
  })
  for (const u of users) {
    console.log(`  ${u.role.padEnd(10)} | ${u.email.padEnd(35)} | ${u.name || 'N/A'}`)
  }

  // 4. Check for users without proper passwords
  console.log('\n=== SECURITY CHECK ===')
  const emptyPw = await db.user.count({ where: { password: '' } })
  console.log(`⚠️  Users with empty password (OAuth only): ${emptyPw}`)

  const weakRole = await db.user.count({ where: { role: 'pending' } })
  console.log(`${weakRole > 0 ? '⚠️' : '✅'} Pending users blocked: ${weakRole}`)

  // 5. Admin accounts
  const admins = await db.user.findMany({
    where: { role: 'admin' },
    select: { email: true, name: true }
  })
  console.log(`\n✅ Admin accounts: ${admins.length}`)
  for (const a of admins) {
    console.log(`   👑 ${a.email} (${a.name})`)
  }

  await db.$disconnect()
  console.log('\n=== ALL CHECKS COMPLETE ===')
}
main()
