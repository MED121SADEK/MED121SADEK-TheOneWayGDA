import { PrismaClient } from '@prisma/client'

async function main() {
  const db = new PrismaClient({
    datasourceUrl: 'postgresql://neondb_owner:npg_MEqk4iNI5dzp@ep-silent-heart-asmo3jgi-pooler.c-4.eu-central-1.aws.neon.tech/neondb?sslmode=require'
  })
  
  // Fix ALL pending/rejected users to 'user'
  const result = await db.user.updateMany({
    where: { role: { in: ['pending', 'rejected'] } },
    data: { role: 'user' }
  })
  console.log(`✅ Updated ${result.count} users to 'user' role`)
  
  // Also fix visitors
  const vResult = await db.visitor.updateMany({
    where: { status: { in: ['pending', 'rejected'] } },
    data: { status: 'accepted' }
  })
  console.log(`✅ Updated ${vResult.count} visitors to 'accepted'`)
  
  await db.$disconnect()
}
main()
