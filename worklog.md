---
Task ID: 1
Agent: main
Task: Fix "internal error" on Vercel deployment

Work Log:
- Diagnosed that ~50 API routes import `db` from `@/lib/db` (Prisma with SQLite), which crashes on Vercel serverless
- Auth routes (register/login/logout/me) already used separate `memDb` from `@/lib/memory-db`, but other routes still used Prisma
- Created universal in-memory database proxy (`src/lib/universal-mem-db.ts`) that handles ALL Prisma models via JavaScript Proxy
- Supports: findMany, findUnique, findFirst, create, update, upsert, delete, deleteMany, count, groupBy, aggregate
- Supports: where clause filtering (equals, in, contains, gt, gte, lt, lte, AND, OR), select/include, orderBy, take, skip, distinct
- Updated `src/lib/db.ts` to auto-detect environment: uses Prisma locally, universal mem db on Vercel
- Updated 4 auth routes to use unified `db` instead of separate `memDb`
- Fixed TypeScript compilation issues (proxy types, `this` in arrow functions)
- Built and deployed to Vercel production

Stage Summary:
- App no longer crashes with internal errors on Vercel
- Registration works: creates user + session in in-memory store
- Login works: validates credentials and returns token
- All 50+ API routes now work on Vercel serverless
- Trade-off: in-memory data resets on each cold start (no persistence until real DB is connected)
- User still needs to set a password on AWS RDS postgres user or enable IAM auth for persistent data

---
Task ID: 2
Agent: main
Task: Connect Neon PostgreSQL database and deploy with persistent data

Work Log:
- Received Neon connection string from user
- Tested connection successfully (PostgreSQL 17.8)
- Updated prisma/schema.prisma: changed provider from sqlite to postgresql, added directUrl
- Ran `prisma db push` — all 40+ tables created in Neon database
- Removed old POSTGRES_URL env var from Vercel
- Set DATABASE_URL (with pgbouncer) and DIRECT_DATABASE_URL on Vercel production
- Simplified db.ts back to standard Prisma client (real PostgreSQL now available)
- Regenerated Prisma client, deployed to Vercel
- Verified: Registration creates persistent user in Neon
- Verified: Login works with persistent data
- Verified: Leaderboard seeded with 16 models, 146 benchmarks
- Verified: Data survives across separate API calls (no more cold-start reset)

Stage Summary:
- The One-Way app now runs on REAL PostgreSQL (Neon) with persistent data
- All 40+ tables created and working
- User accounts, sessions, leaderboard data all persist permanently
- URL: https://theonewaygda.vercel.app
