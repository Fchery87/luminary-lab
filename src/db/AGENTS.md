# Database Directory - Drizzle ORM & Schema

## Package Identity
- **Purpose**: Drizzle ORM schema, database connection, and migrations
- **Technology**: TypeScript, Drizzle ORM, PostgreSQL

## Setup & Run
```bash
# Generate Drizzle types and migrations
bun db:generate

# Push schema to database (development)
bun db:push

# Run migrations (production)
bun db:migrate

# Open Drizzle Studio (database admin)
bun db:studio
```

## Patterns & Conventions

### Schema Organization
```
src/db/
├── schema.ts          # All table definitions
├── index.ts          # Database connection and export
├── seed.ts           # Database seeding scripts
└── migrations/       # Migration files (auto-generated)
```

### Table Definition Pattern
```typescript
// ✅ DO: Use Drizzle pgTable with proper types
import { pgTable, text, timestamp, boolean, uuid } from 'drizzle-orm/pg-core';
import { v7 as uuidv7 } from 'uuid';

export const users = pgTable("users", {
  id: uuid("id").primaryKey().$defaultFn(() => uuidv7()),
  email: text("email").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ✅ DO: Add proper references
export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().$defaultFn(() => uuidv7()),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
});
```

### Database Connection
```typescript
// ✅ DO: Use Drizzle with proper Neon configuration
import { drizzle } from 'drizzle-orm/neon-http';
import { schema } from './schema';

export const db = drizzle(process.env.DATABASE_URL!, { schema });

// ❌ DON'T: Use different database configurations
// Avoid multiple connection strings in production
```

### Migration Strategy
```typescript
// ✅ DO: Use Drizzle Kit for migrations
// drizzle.config.ts handles configuration

// ✅ DO: Seed data in separate file
// Run with custom script, not in application logic

// ✅ DO: Include relations in schema
// Proper foreign key relationships
```

## Touch Points / Key Files
```
- Schema: src/db/schema.ts
- Connection: src/db/index.ts
- Seeding: src/db/seed.ts
- Config: drizzle.config.ts
- Environment: .env (DATABASE_URL)
```

## JIT Index Hints
```bash
# Find all tables
rg -n "export.*=.*pgTable" src/db/schema.ts

# Find specific table
rg -n "projects.*=.*pgTable" src/db/schema.ts

# Find database connection
rg -n "drizzle.*DATABASE_URL" src/db

# Find relations
rg -n "references.*users\.id" src/db/schema.ts
```

## Common Gotchas
- **Never commit DATABASE_URL** or other credentials
- **Use Neon HTTP** for serverless deployment
- **Always run migrations** before starting production app
- **Seed data** should be idempotent
- **Timestamp defaults**: use `defaultNow()` not `default(new Date())`

## Pre-PR Checks
```bash
# Type check database schema
bunx tsc --noEmit

# Test database connection
bun db:push

# Run migrations
bun db:migrate

# Seed test data
bun --bun src/db/seed.ts
```

### Schema Examples
```typescript
// ✅ DO: Complete table with relations
export const images = pgTable("images", {
  id: uuid("id").primaryKey().$defaultFn(() => uuidv7()),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // 'original', 'processed', 'thumbnail'
  storageKey: text("storage_key").notNull(),
  filename: text("filename").notNull(),
  sizeBytes: text("size_bytes").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ✅ DO: Export all tables for imports
export const schema = {
  users,
  projects,
  images,
  systemStyles,
  processingJobs,
  userSubscriptions,
  // ... all other tables
};
```

### Database Seeding
```typescript
// ✅ DO: Idempotent seeding
export async function seedPresets() {
  try {
    // Check if data exists
    const existing = await db.select().from(systemStyles);
    if (existing.length > 0) {
      console.log('Presets already exist');
      return;
    }
    
    // Insert data
    await db.insert(systemStyles).values(presets);
    console.log('Seeded presets');
  } catch (error) {
    console.error('Seeding error:', error);
  }
}
```
