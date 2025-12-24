# Deleting Users from Neon Database

## Short Answer

**Drizzle ORM**: ❌ No - Drizzle is just a query library, it doesn't sync in real-time.

**Better Auth**: ❌ No - Better Auth reads from the database as its source of truth.

**What happens**: The user is immediately considered non-existent on the next API request.

---

## What Gets Deleted (Cascade Relationships)

When you delete a user from the `users` table, PostgreSQL will automatically delete related records due to `onDelete: "cascade"` constraints.

### ✅ Cascade Delete Tables

| Table | What Gets Deleted | Cascade Config |
|--------|-------------------|-----------------|
| `sessions` | All user sessions | ✅ `cascade` |
| `accounts` | All OAuth/credential accounts | ✅ `cascade` |
| `verifications` | All verification tokens | ✅ `cascade` |
| `user_subscriptions` | User subscriptions | ✅ `cascade` |
| `projects` | All user projects | ✅ `cascade` |
| `images` | All project images | ✅ `cascade` (via projects) |
| `processing_jobs` | All processing jobs | ✅ `cascade` (via projects) |
| `usage_tracking` | Usage records | ✅ `cascade` |

### ⚠️ Set Null Tables

| Table | What Happens | Reason |
|--------|--------------|---------|
| `audit_logs` | `userId` set to NULL | ✅ Preserves audit trail |

### 🚫 No Delete (Restrict)

| Table | What Happens | Reason |
|--------|--------------|---------|
| `subscription_plans` | NOT deleted | Parent table, no user relation |
| `system_styles` | NOT deleted | Parent table, no user relation |

---

## Direct Database Deletion vs Better Auth Delete API

### Option 1: Direct SQL Delete (Neon Console / psql)

```sql
DELETE FROM "users" WHERE email = 'user@example.com';
```

**Pros:**
- ✅ Immediate deletion
- ✅ Cascade deletes all related data
- ✅ Can be done from Neon console

**Cons:**
- ❌ Active session cookies remain valid until expiration
- ❌ No audit log of deletion
- ❌ Doesn't trigger Better Auth hooks
- ❌ Doesn't revoke API keys or tokens properly

**What Happens:**
1. User is deleted from database
2. Cascade deletes all related records
3. If user has active session cookie, next API request will fail
4. Better Auth will return "user not found" error
5. Session cookie may still be valid until server checks

---

### Option 2: Better Auth Delete API (Recommended)

```typescript
import { auth } from '@/lib/auth';

// Delete user
const response = await fetch('/api/auth/delete-user', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Cookie': document.cookie, // Include session cookie
  },
});
```

**Pros:**
- ✅ Properly revokes all sessions
- ✅ Triggers Better Auth hooks and events
- ✅ Creates audit trail
- ✅ Handles cleanup in transaction
- ✅ Invalidates session cookies immediately

**Cons:**
- ⚠️ Requires active session
- ⚠️ Must call API endpoint

**What Happens:**
1. Better Auth validates session
2. Runs `onDeleteUser` hook if configured
3. Deletes user from database
4. Cascade deletes all related records
5. Revokes all sessions immediately
6. Clears session cookies
7. Can log audit trail

---

## Deleting Multiple Users (Admin Operations)

### Option 1: Direct SQL Query

```sql
-- Delete users by email pattern
DELETE FROM "users" WHERE email LIKE '%@domain.com';

-- Delete all users created before date
DELETE FROM "users" WHERE created_at < '2025-01-01';

-- Delete inactive users
DELETE FROM "users"
WHERE id NOT IN (
  SELECT DISTINCT user_id FROM "sessions"
  WHERE expires_at > NOW()
);
```

### Option 2: Using Drizzle ORM

```typescript
import { db } from '@/db';
import { users } from '@/db/schema';

// Delete specific user
await db.delete(users).where(eq(users.email, 'user@example.com'));

// Delete multiple users
await db.delete(users)
  .where(inArray(users.email, [
    'user1@example.com',
    'user2@example.com',
  ]));

// Delete inactive users
await db.delete(users)
  .where(notInArray(users.id, db.select({ id: sessions.userId })
    .from(sessions)
    .where(gt(sessions.expiresAt, new Date()))));
```

### Option 3: Admin Better Auth Hook

```typescript
// src/lib/auth.ts
export const auth = betterAuth({
  // ... other config
  hooks: {
    before: [
      {
        matcher(context) {
          return context.path === '/delete-user';
        },
        handler: async (ctx) => {
          // Log deletion attempt
          console.log('User deletion attempted:', ctx.body);
        }
      }
    ],
    after: [
      {
        matcher(context) {
          return context.path === '/delete-user';
        },
        handler: async (ctx) => {
          // Log successful deletion
          console.log('User deleted successfully:', ctx.user);
        }
      }
    ]
  }
});
```

---

## Session Cookie Behavior After Direct Delete

### Scenario: User Deleted While Logged In

```
1. User is logged in (has valid session cookie)
2. Admin deletes user from Neon console
3. User refreshes page
4. Next.js calls Better Auth getSession
5. Better Auth queries database for user by session.user_id
6. Database returns "no rows" (user was deleted)
7. Better Auth returns null for session
8. Application treats as "not authenticated"
9. Redirects to login page
```

### Session Cookie TTL

- **Better Auth Session Cookie**: Max 1 hour (by default)
- **After User Delete**: Cookie still exists until:
  - Session expires naturally (1 hour)
  - User tries to authenticate (fails immediately)
  - Server restarts (clears memory cache)

### Forced Session Invalidation

To immediately invalidate all sessions after direct delete:

```typescript
import { db } from '@/db';
import { sessions } from '@/db/schema';

// Get all sessions for user
const userSessions = await db.select()
  .from(sessions)
  .where(eq(sessions.userId, userId));

// Delete all sessions
await db.delete(sessions)
  .where(eq(sessions.userId, userId));
```

---

## Recovery: What If You Accidentally Delete a User?

### Option 1: Database Restore (Best)

```sql
-- Check point-in-time recovery
-- Neon supports time travel queries
SELECT * FROM "users"
AS OF SYSTEM TIME '2025-12-24 02:00:00';

-- This shows users as of 2 hours ago
```

### Option 2: Replicate Lost Data

```typescript
// If you have user info from logs/email
await db.insert(users).values({
  email: 'user@example.com',
  name: 'John Doe',
  emailVerified: false,
  // ... other fields
});
```

### Option 3: Restore from Audit Logs

```typescript
import { db } from '@/db';
import { auditLogs } from '@/db/schema';

// Find user creation log
const userCreation = await db.select()
  .from(auditLogs)
  .where(
    and(
      eq(auditLogs.userId, userId),
      eq(auditLogs.action, 'user_created')
    )
  )
  .orderBy(desc(auditLogs.timestamp))
  .limit(1);

// Extract user details from logs
const userData = JSON.parse(userCreation[0].details);
console.log('User data:', userData);
```

---

## Best Practices for User Deletion

### ✅ Do's

1. **Use Better Auth API** for single user deletions
2. **Use transactions** for batch deletions
3. **Log all deletions** to audit trail
4. **Test cascade behavior** in development first
5. **Backup before bulk deletes**
6. **Inform users** before deletion (if applicable)

### ❌ Don'ts

1. **Don't delete** users referenced in active projects without checking
2. **Don't delete** subscription plans (users reference them)
3. **Don't forget** about session cookie invalidation
4. **Don't skip** audit logging for compliance
5. **Don't bulk delete** without WHERE clause

---

## Summary

| Operation | Direct DB Delete | Better Auth API |
|-----------|------------------|------------------|
| **Data Integrity** | ✅ Cascade works | ✅ Same + transaction safety |
| **Sessions** | ❌ Remain until check | ✅ Immediately revoked |
| **Audit Trail** | ❌ Unless manually logged | ✅ Automatic via hooks |
| **Hooks/Events** | ❌ Not triggered | ✅ Fully executed |
| **Real-time Sync** | ❌ Drizzle doesn't know | ✅ N/A (source is DB) |

**Recommendation**: Use Better Auth's delete API for production use cases. Direct database deletion is fine for emergency cleanup or admin operations, but remember to manually revoke sessions.
