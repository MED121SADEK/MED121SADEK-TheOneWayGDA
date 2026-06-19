# ═══════════════════════════════════════════════════════════
# The One-Way — Multi-stage Docker Build for Render.com
# Runtime: bun + Next.js standalone output + PostgreSQL (Neon)
# ═══════════════════════════════════════════════════════════

# ── Stage 1: Dependencies ──
FROM oven/bun:1-alpine AS deps
WORKDIR /app

COPY package.json bun.lock ./
COPY prisma ./prisma/

RUN bun install --frozen-lockfile --production=false
RUN bunx prisma generate

# ── Stage 2: Build ──
FROM oven/bun:1-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# DATABASE_URL will be provided at runtime via Render env vars
# Use a placeholder for build time (Prisma needs it to analyze the schema)
ARG DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"
ENV DATABASE_URL=${DATABASE_URL}

RUN bun run build

# ── Stage 3: Production Runtime ──
FROM oven/bun:1-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Render.com injects PORT automatically
ENV PORT=10000
ENV HOSTNAME="0.0.0.0"

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 oneway

# Create necessary directories
RUN mkdir -p /app/public /app/logs && \
    chown -R oneway:nodejs /app

# Copy standalone output
COPY --from=builder --chown=oneway:nodejs /app/.next/standalone ./
COPY --from=builder --chown=oneway:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=oneway:nodejs /app/public ./public

# Copy Prisma for runtime migrations
COPY --from=builder --chown=oneway:nodejs /app/prisma ./prisma
COPY --from=builder --chown=oneway:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=oneway:nodejs /app/node_modules/@prisma ./node_modules/@prisma

# Switch to non-root user
USER oneway

# Health check (Render.com uses PORT 10000 on free tier)
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:10000/api/health || exit 1

EXPOSE 10000

# Run database migration then start the server
CMD ["sh", "-c", "npx prisma migrate deploy && bun server.js"]