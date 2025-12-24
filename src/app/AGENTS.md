# App Directory - Next.js Routes & Pages

## Package Identity
- **Purpose**: Next.js 16 App Router pages and API routes
- **Technology**: TypeScript, React Server Components
- **Structure**: File-based routing with conventions

## Setup & Run
```bash
# Development (already running from root)
bun dev

# Build check
bunx next build

# Type check app routes
bunx tsc --noEmit --project tsconfig.json
```

## Patterns & Conventions

### File-Based Routing
```
src/app/
├── (auth)/           # Route groups
├── api/             # API routes
├── dashboard/        # Page: /dashboard
├── upload/           # Page: /upload
├── edit/[projectId]/   # Dynamic: /edit/:id
├── compare/[projectId]/ # Dynamic: /compare/:id
├── export/[projectId]/  # Dynamic: /export/:id
├── process/[projectId]/ # Dynamic: /process/:id
├── pricing/          # Page: /pricing
├── login/           # Page: /login
├── register/         # Page: /register
├── page.tsx         # Page: /
├── layout.tsx        # Root layout
├── globals.css        # Global styles
└── providers.tsx     # App providers
```

### Page Components
```typescript
// ✅ DO: Server components by default
export default function ProjectPage() {
  return <div>Content</div>;
}

// ✅ DO: Client components when needed
'use client';
export default function InteractivePage() {
  const [state, setState] = useState();
  return <div>Interactive content</div>;
}

// ✅ DO: Dynamic routes with params
export default function EditPage({ params }: { params: { projectId: string } }) {
  return <div>Editing {params.projectId}</div>;
}
```

### API Routes
```typescript
// ✅ DO: API route with proper typing
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const schema = z.object({ projectId: z.string() });

export async function POST(request: NextRequest) {
  const body = await request.json();
  const validated = schema.safeParse(body);
  
  if (!validated.success) {
    return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
  }
  
  // API logic
  return NextResponse.json({ success: true });
}
```

### Route Groups
```typescript
// ✅ DO: Use route groups for shared layouts
src/app/(auth)/login/page.tsx     # /login
src/app/(auth)/register/page.tsx  # /register
src/app/(auth)/layout.tsx          # Shared auth layout
```

## Touch Points / Key Files
```
- Root layout: src/app/layout.tsx
- App providers: src/app/providers.tsx
- Auth pages: src/app/login/page.tsx, src/app/register/page.tsx
- Main dashboard: src/app/dashboard/page.tsx
- Upload flow: src/app/upload/page.tsx, src/app/edit/[projectId]/page.tsx
- Processing: src/app/process/[projectId]/page.tsx
- Export: src/app/compare/[projectId]/page.tsx, src/app/export/[projectId]/page.tsx
- API routes: src/app/api/**/*.ts
```

## JIT Index Hints
```bash
# Find all pages
find src/app -name "page.tsx" -o -name "page.ts"

# Find all API routes
find src/app/api -name "*.ts"

# Find dynamic routes
find src/app -name "\[*\]" -type d

# Search page content
rg -n "export default.*function" src/app

# Search API handlers
rg -n "export.*async.*function.*GET" src/app/api
```

## Common Gotchas
- **Always import from '@/'** for absolute paths
- **API routes return NextResponse**, not Response
- **Dynamic routes need params in function signature**
- **Server components can be async for data fetching**
- **Client components need 'use client' directive**
- **Route groups don't affect URL structure**

## Pre-PR Checks
```bash
# Type check all app files
bunx tsc --noEmit

# Build check
bun build

# Start development server
bun dev
```

### Page Testing
```bash
# Access key pages
curl http://localhost:3000/
curl http://localhost:3000/dashboard
curl http://localhost:3000/upload
```
