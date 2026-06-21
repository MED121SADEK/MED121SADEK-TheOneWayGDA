import { PrismaClient } from '@prisma/client'

async function main() {
  const db = new PrismaClient({
    datasourceUrl: 'postgresql://neondb_owner:npg_MEqk4iNI5dzp@ep-silent-heart-asmo3jgi-pooler.c-4.eu-central-1.aws.neon.tech/neondb?sslmode=require'
  })
  
  // Approve and make admin
  const user = await db.user.update({
    where: { email: 'msad41855@gmail.com' },
    data: { role: 'admin' }
  })
  console.log(`✅ ${user.email} is now ADMIN`)
  
  // Also update visitor status
  try {
    await db.visitor.update({
      where: { email: 'msad41855@gmail.com' },
      data: { status: 'accepted' }
    })
    console.log('✅ Visitor status updated to accepted')
  } catch { console.log('No visitor record') }
  
  await db.$disconnect()
}
main()
