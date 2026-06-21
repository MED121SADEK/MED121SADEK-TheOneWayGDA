import { PrismaClient } from '@prisma/client'
async function main() {
  const db = new PrismaClient({ datasourceUrl: 'postgresql://neondb_owner:npg_MEqk4iNI5dzp@ep-silent-heart-asmo3jgi-pooler.c-4.eu-central-1.aws.neon.tech/neondb?sslmode=require' })
  await db.user.deleteMany({ where: { email: 'test@example.com' } })
  await db.visitor.deleteMany({ where: { email: 'test@example.com' } })
  console.log('✅ Test user cleaned up')
  await db.$disconnect()
}
main()
