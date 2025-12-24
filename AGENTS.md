# Luminary Lab - AI Agent Development Guide

## Project Snapshot
- **Type**: Next.js application (not monorepo)
- **Tech Stack**: TypeScript, Next.js 16, Drizzle ORM, Better Auth, Tailwind CSS
- **Package Manager**: Bun
- **Note**: Sub-directories have their own AGENTS.md files

## Root Setup Commands
```bash
# Install all dependencies
bun install

# Run development server
bun dev

# Build for production
bun build

# Start production server
bun start

# Type checking
bunx tsc --noEmit

# Linting
bun lint

# Database commands
bun db:generate    # Generate schema
bun db:push       # Push to database
bun db:migrate     # Run migrations
bun db:studio     # Open Drizzle Studio
```

## Universal Conventions
- **TypeScript**: Strict mode enabled
- **Code Style**: ESLint + Prettier (via Next.js config)
- **Import Style**: Use `@/` for absolute imports
- **Environment**: All secrets in `.env`, never committed
- **Database**: Drizzle ORM with PostgreSQL
- **Styling**: Tailwind CSS, avoid inline styles

## Security & Secrets
- Never commit `.env` files or API keys
- Use `NEXT_PUBLIC_` prefix for client-side env vars
- S3 keys must be kept secure
- Stripe webhook secret must match endpoint

## JIT Index (what to open, not what to paste)

### Directory Structure
- App pages/routes: `src/app/` → [see src/app/AGENTS.md](src/app/AGENTS.md)
- UI components: `src/components/` → [see src/components/AGENTS.md](src/components/AGENTS.md)
- Core services: `src/lib/` → [see src/lib/AGENTS.md](src/lib/AGENTS.md)
- Database: `src/db/` → [see src/db/AGENTS.md](src/db/AGENTS.md)

### Quick Find Commands
- Find a component: `rg -n "export.*Component" src/components`
- Find API route: `rg -n "export (async function|const)" src/app/api`
- Find utility: `rg -n "export" src/lib`
- Find database model: `rg -n "export.*=.*pgTable" src/db`
- Find tests: `find . -name "*.test.ts" -o -name "*.spec.ts"`

### Common Patterns
```typescript
// ✅ DO: Absolute imports
import { Button } from '@/components/ui/button';
import { db } from '@/db';

// ❌ DON'T: Relative imports
import { Button } from '../../../components/ui/button';

// ✅ DO: Server Actions (App Router)
'use server';
export async function createProject(data: FormData) {
  // Server-side logic
}

// ✅ DO: API Routes (App Router)
export async function GET(request: NextRequest) {
  // API logic
}
```

## Definition of Done
Before creating a PR, ensure:
- [ ] All TypeScript compilation passes
- [ ] Development server starts without errors
- [ ] Database migrations are applied
- [ ] Tests pass (if tests exist)
- [ ] Build completes successfully
- [ ] No sensitive data in commits
