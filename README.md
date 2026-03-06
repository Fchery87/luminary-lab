# Luminary Lab

A Next.js 16 application for AI-powered image processing and styling.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Database**: Drizzle ORM with PostgreSQL (Neon)
- **Authentication**: Better Auth
- **Styling**: Tailwind CSS 4
- **Package Manager**: Bun
- **Payments**: Stripe
- **Storage**: AWS S3 / Cloudflare R2
- **Background Jobs**: BullMQ with Redis
- **Monitoring**: Sentry
- **Real-time**: Socket.io

## Getting Started

```bash
# Install dependencies
bun install

# Run development server
bun dev

# Build for production
bun build

# Start production server
bun start
```

## Database

```bash
# Generate schema
bun db:generate

# Push to database
bun db:push

# Run migrations
bun db:migrate

# Open Drizzle Studio
bun db:studio
```

## Environment Variables

See `.env.example` for required environment variables. Key variables:
- `DATABASE_URL` - PostgreSQL connection string
- `BETTER_AUTH_SECRET` - Authentication secret
- `STRIPE_SECRET_KEY` - Stripe API key
- `AWS_S3_BUCKET` - S3/R2 bucket name
- `REDIS_URL` - Redis connection for job queue

## Project Structure

- `src/app/` - Next.js routes and pages
- `src/components/` - UI components
- `src/lib/` - Core services (auth, stripe, s3, queue)
- `src/db/` - Database schema and migrations
- `specs/` - Project specifications and documentation

## Commands

- `bun dev` - Start development server
- `bun build` - Build for production
- `bun lint` - Run ESLint
- `bunx tsc --noEmit` - Type check
- `bun test` - Run tests
- `bun test:e2e` - Run E2E tests
