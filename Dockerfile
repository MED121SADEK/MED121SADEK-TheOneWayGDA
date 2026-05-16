# ═══════════════════════════════════════════════════════════
# The One-Way — Multi-stage Docker Build
# Optimized for: small image size, fast builds, layer caching
# Runtime: bun + Next.js standalone output
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

# Build argument for database path (override at build time)
ARG DATABASE_URL="file:/app/db/production.db"
ENV DATABASE_URL=${DATABASE_URL}

RUN bun run build

# ── Stage 3: Production Runtime ──
FROM oven/bun:1-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 oneway

# Create data directories
RUN mkdir -p /app/db /app/public /app/logs && \
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

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

EXPOSE 3000

CMD ["bun", "server.js"]
