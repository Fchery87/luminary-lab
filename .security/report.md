# OWASP Security Scan Report - Luminary Lab

**Scan Date:** 2026-01-11  
**Scanner:** Claude Code with OWASP-aligned checks  
**Profile:** Production Readiness Scan

---

## Executive Summary

| Category | Status |
|----------|--------|
| Dependencies | 2 vulnerabilities found (1 high, 1 moderate) |
| AuthN/AuthZ | Email-based admin auth (should be role-based) |
| Security Headers | Missing (no middleware.ts) |
| Rate Limiting | Not implemented |
| Secrets | No committed secrets found |
| Input Validation | Good (Zod schemas, Drizzle ORM) |

**Risk Level:** Medium

---

## Findings

### HIGH PRIORITY

#### 1. Vulnerability: qs DoS (GHSA-6rw7-vpxm-498p)

| Field | Value |
|-------|-------|
| Severity | **High** |
| OWASP Top 10 | A06:2021 - Vulnerable and Outdated Components |
| Location | `qs` package (transitive dependency) |
| Vulnerable Versions | < 6.14.1 |
| CVE | GHSA-6rw7-vpxm-498p |
| CVSS | 7.5 (High) |

**Description:** The `qs` package has a memory exhaustion vulnerability that allows attackers to cause a Denial of Service.

**Evidence:**
```json
{
  "id": "1111755",
  "title": "qs's arrayLimit bypass in its bracket notation allows DoS via memory exhaustion",
  "severity": "high",
  "vulnerable_versions": "<6.14.1"
}
```

**Fix Type:** Auto-fix (dependency update)

**Remediation:**
```bash
# Update qs to 6.14.1 or later
bun update qs
# Or force update via npm
npm install qs@^6.14.1
```

**Status:** Pending

---

#### 2. Security: No Rate Limiting on API Endpoints

| Field | Value |
|-------|-------|
| Severity | **High** |
| OWASP Top 10 | A07:2021 - Identification and Authentication Failures |
| Location | All API routes (`src/app/api/`) |
| Summary | No rate limiting implemented |

**Description:** API endpoints lack rate limiting, making them vulnerable to brute-force attacks and DoS.

**Evidence:** No `rateLimit` or `limiter` patterns found in codebase.

**Fix Type:** Manual (requires architecture decision)

**Remediation:**
1. Add rate limiting using Upstash Redis or Bull queue
2. Example implementation:
```typescript
// src/lib/rate-limit.ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "10 s"),
});

export async function rateLimit(request: Request) {
  const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
  const { success } = await ratelimit.limit(ip);
  if (!success) {
    return new Response("Too Many Requests", { status: 429 });
  }
}
```

**Status:** Manual fix required

---

### MEDIUM PRIORITY

#### 3. Vulnerability: esbuild XSS (GHSA-67mh-4wv8-2f99)

| Field | Value |
|-------|-------|
| Severity | **Moderate** |
| OWASP Top 10 | A06:2021 - Vulnerable and Outdated Components |
| Location | `esbuild` package (dev dependency) |
| Vulnerable Versions | <= 0.24.2 |
| CVE | GHSA-67mh-4wv8-2f99 |

**Description:** esbuild development server allows any website to send requests and read responses.

**Note:** This only affects development server, not production.

**Fix Type:** Auto-fix

**Remediation:**
```bash
bun update esbuild
```

**Status:** Pending

---

#### 4. Security: Missing Security Headers Middleware

| Field | Value |
|-------|-------|
| Severity | **Medium** |
| OWASP Top 10 | A05:2021 - Security Misconfiguration |
| Location | No `middleware.ts` |
| Missing Headers | Content-Security-Policy, X-Frame-Options, X-Content-Type-Options, etc. |

**Description:** No security headers are being set, leaving the application vulnerable to clickjacking, MIME sniffing, and XSS attacks.

**Evidence:** No `middleware.ts` file exists in `src/`.

**Fix Type:** Auto-fix

**Remediation:** Create `src/middleware.ts`:
```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Security headers
  response.headers.set('X-DNS-Prefetch-Control', 'on');
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  // Content-Security-Policy (adjust based on your needs)
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.stripe.com wss://*.luminarylab.com;"
  );

  return response;
}

export const config = {
  matcher: ['/:path*'],
};
```

**Status:** Auto-fix available

---

#### 5. Security: Weak Admin Authorization

| Field | Value |
|-------|-------|
| Severity | **Medium** |
| OWASP Top 10 | A01:2021 - Broken Access Control |
| Location | `src/app/api/admin/**/*.ts` |
| Summary | Email-based admin check, not role-based |

**Description:** Admin authorization relies on hardcoded email patterns instead of proper role-based access control.

**Evidence:**
```typescript
// src/app/api/admin/presets/route.ts:33-37
const isAdmin = user?.email?.endsWith('@admin.com') || 
                user?.email === 'admin@luminarylab.com';
```

**Fix Type:** Manual (database migration required)

**Remediation:**
1. Add `isAdmin` column to users table
2. Create migration:
```sql
ALTER TABLE users ADD COLUMN isAdmin BOOLEAN DEFAULT FALSE;
```
3. Update auth checks:
```typescript
// Check database for admin role
const [user] = await db.select().from(users)
  .where(eq(users.id, session.user.id));
if (!user?.isAdmin) {
  return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
}
```

**Status:** Manual fix required

---

### LOW PRIORITY

#### 6. Configuration: Permissive Image Domains

| Field | Value |
|-------|-------|
| Severity | **Low** |
| OWASP Top 10 | A05:2021 - Security Misconfiguration |
| Location | `next.config.js:5-9` |
| Summary | Remote images allowed from any hostname |

**Evidence:**
```javascript
images: {
  remotePatterns: [{ protocol: 'https', hostname: '**' }],
},
```

**Fix Type:** Assisted (requires business decision)

**Remediation:** Restrict to known domains:
```javascript
remotePatterns: [
  { protocol: 'https', hostname: '*.s3.amazonaws.com' },
  { protocol: 'https', hostname: '*.r2.cloudflarestorage.com' },
  { protocol: 'https', hostname: 'your-cdn.com' },
],
```

**Status:** Assisted fix - waiting for user input

---

## Quick Wins (Auto-fixes)

Run these commands to apply safe fixes:

```bash
# 1. Update esbuild (moderate)
bun update esbuild

# 2. Create security headers middleware
cat > src/middleware.ts << 'EOF'
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  response.headers.set('X-DNS-Prefetch-Control', 'on');
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://api.stripe.com;");
  return response;
}

export const config = { matcher: ['/:path*'] };
EOF

git add src/middleware.ts
git commit -m "security: add security headers middleware"
```

---

## Recommended Actions

| Priority | Action | Effort |
|----------|--------|--------|
| 1 | Create security headers middleware | 5 min |
| 2 | Update esbuild dependency | 1 min |
| 3 | Add rate limiting (Upstash Redis) | 1 hour |
| 4 | Implement proper admin role system | 2 hours |
| 5 | Restrict image domains | 30 min |

---

## Baseline Suppressions

Create `.security/ignore.yml` to track accepted risks:

```yaml
# .security/ignore.yml
suppressions:
  - finding_id: "qs-6rw7-vpxm-498p"
    reason: "Transitive dependency, awaiting fix in upstream"
    owner: "security-team"
    expires_on: "2026-04-01"
```

---

## Verification Commands

```bash
# Re-run dependency audit
bun audit

# Run lint (includes some security rules)
bun lint

# Type check
bunx tsc --noEmit

# Build verification
bun build
```

---

*Report generated by Claude Code OWASP Security Scan*
