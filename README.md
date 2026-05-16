# The One-Way

> AI Model Comparison & Leaderboard Platform

**The One-Way** is a comprehensive SaaS platform for comparing, benchmarking, and ranking AI models. It provides real-time analytics, collaboration tools, AI-powered assistants, automation workflows, and a robust API for enterprise integration.

## Features

- **AI Model Leaderboard** — Real-time rankings across multiple benchmarks
- **AI Specialist Assistants** — 7 domain-expert agents (Data Analyst, ML Engineer, Statistician, Code Generator, Report Writer, Research Synthesizer, Automation Architect)
- **Flagship AI Workflows** — Plan, Execute, and Report pipeline with deep context
- **Automation Engine** — 12 action types, 6 trigger types, sequential chaining with conditional logic
- **Team Collaboration** — Shared workspaces, comments, reviews, and role-based access
- **Advanced Analytics** — Performance dashboards, trend analysis, and export tools
- **Monetization & API** — Subscription plans, usage billing, and REST API with rate limiting
- **Enterprise Security** — 2FA, RBAC, WAF, and audit logging

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **UI**: Tailwind CSS + shadcn/ui
- **Database**: SQLite + Prisma ORM
- **Auth**: NextAuth.js
- **AI**: z-ai-web-dev-sdk
- **Deployment**: Docker + Caddy

## Getting Started

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local

# Run database migrations
npx prisma db push

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Stats

- 101 pages
- 90+ API routes
- 41 database models
- 7 AI assistants
- 12 automation actions

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
