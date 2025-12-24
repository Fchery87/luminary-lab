# Neon Database + Drizzle ORM + Better Auth Integration Guide

## Overview

This guide explains how to integrate Neon PostgreSQL database, Drizzle ORM, and Better Auth authentication library seamlessly in a Next.js application with Bun.

## Prerequisites

```bash
bun install @neondatabase/serverless drizzle-orm drizzle-orm/neon-http better-auth
```

## 1. Neon Database Connection

### Connection String Format

```env
DATABASE_URL=postgresql://username:password@ep-xyz.region.aws.neon.tech/neondb?sslmode=require
```

### Initialize Neon Connection

```typescript
// src/db/index.ts
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

const databaseUrl = process.env.DATABASE_URL!;
const sql = neon(databaseUrl);
export const db = drizzle({ client: sql, schema });
```

**Key Points:**
- Use `neon()` function from `@neondatabase/serverless` for HTTP-based connections
- Use `drizzle-orm/neon-http` adapter for serverless environments
- Pass the schema object to drizzle for type safety

## 2. Drizzle ORM Schema Definition

### Required Schema for Better Auth

```typescript
// src/db/schema.ts
import { pgTable, text, timestamp, boolean, uuid } from 'drizzle-orm/pg-core';
import { v7 as uuidv7 } from 'uuid';

export const users = pgTable("users", {
  id: uuid("id").primaryKey().$defaultFn(() => uuidv7()),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false),
  name: text("name"),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().$defaultFn(() => uuidv7()),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const accounts = pgTable("accounts", {
  id: uuid("id").primaryKey().$defaultFn(() => uuidv7()),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  password: text("password"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const verifications = pgTable("verifications", {
  id: uuid("id").primaryKey().$defaultFn(() => uuidv7()),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const schema = {
  users,
  sessions,
  accounts,
  verifications,
};
```

**Important Schema Notes:**
1. **`emailVerified`** must be `boolean`, not `timestamp`
2. **Column Names**: Use camelCase for TypeScript, snake_case for database
3. **UUID Generation**: Use PostgreSQL-compatible UUID types
4. **Foreign Keys**: Set proper `onDelete: "cascade"` for data integrity

## 3. Better Auth Configuration

### Complete Setup with Drizzle Adapter

```typescript
// src/lib/auth.ts
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db, schema } from '@/db';

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',          // PostgreSQL
    usePlural: true,       // Tables are plural (users, sessions, etc.)
    schema,                 // Pass the Drizzle schema
  }),
  advanced: {
    database: {
      generateId: 'uuid',   // Use PostgreSQL UUID format
    },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  session: {
    expiresIn: 60 * 60,     // 1 hour
    updateAge: 60 * 5,      // 5 minutes
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,       // 5 minutes
    },
  },
  account: {
    accountLinking: {
      enabled: false,
    },
  },
});
```

### API Route Handler (Next.js App Router)

```typescript
// src/app/api/auth/[...all]/route.ts
import 'server-only';
import { toNextJsHandler } from 'better-auth/next-js';
import { auth } from '@/lib/auth';

const { GET, POST } = toNextJsHandler(auth);

export { GET, POST };
```

## 4. Drizzle Kit Configuration

### drizzle.config.ts

```typescript
import { defineConfig } from "drizzle-kit";
import { config } from 'dotenv';

config({ path: '.env' });

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

### Available Commands

```bash
# Generate schema migration
bun db:generate

# Push schema to database (development)
bun db:push

# Run migrations (production)
bun db:migrate

# Open Drizzle Studio
bun db:studio
```

## 5. Common Issues & Solutions

### Issue 1: Invalid UUID Format

**Error:** `invalid input syntax for type uuid`

**Cause:** Better Auth's default ID generator doesn't match PostgreSQL UUID format

**Solution:** Add `advanced.database.generateId: 'uuid'` to Better Auth config

### Issue 2: emailVerified Type Mismatch

**Error:** `column "email_verified" cannot be cast automatically to type boolean`

**Cause:** `emailVerified` column was defined as `timestamp` instead of `boolean`

**Solution:** Change schema to use `boolean("email_verified")` type

### Issue 3: Tables Not Found

**Error:** `The model "user" was not found in the schema object`

**Cause:** Drizzle schema not passed to the drizzle adapter

**Solution:** Add `schema` parameter to `drizzleAdapter` configuration

### Issue 4: Plural/Singular Table Names

**Error:** `relation "user" does not exist`

**Cause:** Better Auth expects singular table names but schema uses plural

**Solution:** Add `usePlural: true` to drizzle adapter config

## 6. Type Safety Best Practices

### Export Schema Types

```typescript
// src/db/schema.ts
export type InsertUser = typeof users.$inferInsert;
export type SelectUser = typeof users.$inferSelect;
export type InsertSession = typeof sessions.$inferInsert;
export type SelectSession = typeof sessions.$inferSelect;
```

### Use Better Auth Types

```typescript
import { auth } from '@/lib/auth';

const session = await auth.api.getSession({
  headers: headers(),
});

if (session?.user) {
  // Type-safe user data
  const email: string = session.user.email;
}
```

## 7. Environment Setup

### .env Variables

```env
# Database
DATABASE_URL=postgresql://username:password@ep-xyz.region.aws.neon.tech/neondb?sslmode=require

# Better Auth
BETTER_AUTH_SECRET=your-secret-key-here-change-this
BETTER_AUTH_URL=http://localhost:3000

# Social Providers (Optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### Security Notes

- Never commit `.env` files
- Use strong `BETTER_AUTH_SECRET` (min 32 characters)
- Enable `sslmode=require` for Neon connections
- Use environment-specific connection strings

## 8. Testing the Integration

### Test Database Connection

```typescript
// test-db.ts
import { db } from './src/db';

const result = await db.execute('select 1');
console.log('Database connected:', result);
```

### Test Registration Endpoint

```typescript
// Register a new user
const response = await fetch('/api/auth/sign-up/email', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'test@example.com',
    password: 'securepassword123',
    name: 'Test User',
  }),
});

const data = await response.json();
console.log('Registration result:', data);
```

## 9. Performance Considerations

### Neon Serverless Best Practices

1. **Connection Pooling**: Use `neon()` for HTTP-based queries (lower latency)
2. **Edge Functions**: Create connection inside request handler
3. **Transaction Support**: Use `drizzle-orm/neon-serverless` with `Pool` for complex transactions

### Drizzle Optimization

1. **Schema Exports**: Export only what's needed to reduce bundle size
2. **Query Caching**: Use Drizzle's built-in query caching where appropriate
3. **Batch Operations**: Use `db.batch()` for multiple operations

### Better Auth Performance

1. **Session Cache**: Enable `cookieCache` to reduce database queries
2. **JWT Tokens**: Consider JWT for stateless scaling
3. **Database Hooks**: Use database hooks for custom caching logic

## 10. Migration Strategy

### Development Flow

```bash
# 1. Modify schema
# 2. Generate migration
bun db:generate

# 3. Push changes to database
bun db:push

# 4. Verify with studio
bun db:studio
```

### Production Flow

```bash
# 1. Generate migration
bun db:generate

# 2. Review migration SQL
cat migrations/xxxxx_migration.sql

# 3. Apply migration
bun db:migrate
```

## Resources

- [Neon Serverless Docs](https://github.com/neondatabase/serverless)
- [Drizzle ORM Docs](https://orm.drizzle.team)
- [Better Auth Docs](https://www.better-auth.com)
- [Drizzle Kit](https://orm.drizzle.team/docs/kit-overview)
