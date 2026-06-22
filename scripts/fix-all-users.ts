import { PrismaClient } from '@prisma/client'
async function main() {
  const db = new PrismaClient({ datasourceUrl: 'postgresql://neondb_owner:npg_MEqk4iNI5dzp@ep-silent-heart-asmo3jgi-pooler.c-4.eu-central-1.aws.neon.tech/neondb?sslmode=require' })
  
  // Show all users
  const users = await db.user.findMany({ select: { email: true, role: true } })
  console.log('Users before fix:')
  users.forEach(u => console.log(`  ${u.role} | ${u.email}`))

  // Fix ALL non-admin users to 'user'
  const result = await db.user.updateMany({
    where: { role: { in: ['pending', 'rejected'] } },
    data: { role: 'user' }
  })
  console.log(`\n✅ Fixed ${result.count} users`)

  // Fix visitors
  await db.visitor.updateMany({
    where: { status: { in: ['pending', 'rejected'] } },
    data: { status: 'accepted' }
  })

  console.log('\nUsers after fix:')
  const after = await db.user.findMany({ select: { email: true, role: true } })
  after.forEach(u => console.log(`  ${u.role} | ${u.email}`))

  await db.$disconnect()
}
main()
