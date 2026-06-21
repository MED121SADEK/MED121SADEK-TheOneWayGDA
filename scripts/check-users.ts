import { PrismaClient } from '@prisma/client'

async function main() {
  const db = new PrismaClient({
    datasourceUrl: 'postgresql://neondb_owner:npg_MEqk4iNI5dzp@ep-silent-heart-asmo3jgi-pooler.c-4.eu-central-1.aws.neon.tech/neondb?sslmode=require'
  })
  
  const pending = await db.user.findMany({ 
    where: { role: 'pending' }, 
    select: { id: true, email: true, name: true, createdAt: true },
    orderBy: { createdAt: 'desc' }
  })
  
  console.log(`=== PENDING USERS (${pending.length}) ===`)
  for (const u of pending) {
    console.log(`ID: ${u.id}`)
    console.log(`Email: ${u.email}`)
    console.log(`Name: ${u.name}`)
    console.log(`Date: ${u.createdAt}`)
    console.log('---')
  }
  
  if (pending.length === 0) console.log('No pending users.')
  
  await db.$disconnect()
}
main()
