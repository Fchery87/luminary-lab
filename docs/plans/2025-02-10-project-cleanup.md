# Project Structure Cleanup Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Eliminate structural clutter by organizing orphaned files, consolidating tests, removing dual package locks, simplifying tsconfig paths, and cleaning up root documentation.

**Architecture:** Systematic cleanup in phases: (1) document organization, (2) orphaned file relocation, (3) test consolidation, (4) config simplification, (5) verification. No breaking changes to functionality.

**Tech Stack:** Next.js 16, Bun, TypeScript, Vitest

---

## Task 1: Archive Documentation to docs/archived/

**Files:**
- Create: `docs/archived/` directory
- Move: 26 markdown files from root to `docs/archived/`

**Step 1: Create archived directory**

```bash
mkdir -p docs/archived
```

**Step 2: Move documentation files**

```bash
cd /home/nochaserz/Documents/Coding\ Projects/luminary-lab
mv CLEAR_CACHE_GUIDE.md docs/archived/
mv CLOUDFLARE_R2_CODE_CHANGES.md docs/archived/
mv CLOUDFLARE_R2_MIGRATION_GUIDE.md docs/archived/
mv CLOUDFLARE_R2_SUMMARY.md docs/archived/
mv CUBIC_BEZIER_ERROR_FIXED.md docs/archived/
mv DASHBOARD_VISUAL_CHANGES_COMPLETED.md docs/archived/
mv DASHBOARD_VISUAL_RECOMMENDATIONS.md docs/archived/
mv FRESH_VISUAL_EFFECTS_GUIDE.md docs/archived/
mv HANDOFF.md docs/archived/
mv IMPLEMENTATION_COMPLETED.md docs/archived/
mv IMPLEMENTATION_SUMMARY.md docs/archived/
mv INFINITE_LOOP_FIX.md docs/archived/
mv LANDING_PAGE_MODERNIZATION_COMPLETE.md docs/archived/
mv LANDING_PAGE_RECOMMENDATIONS.md docs/archived/
mv LANDING_PAGE_STRONG_RECOMMENDATIONS.md docs/archived/
mv LANDING_PAGE_VISUAL_COMPARISON.md docs/archived/
mv NOISE_TEXTURE_FIX.md docs/archived/
mv QUICK_DASHBOARD_FIXES.md docs/archived/
mv SENTRY_FIX.md docs/archived/
mv WEBSOCKET_FIX.md docs/archived/
mv VALIDATION_TASKS.md docs/archived/
mv 2025-12-14-luminary-lab-implementation-plan.md docs/archived/
mv CLAUDE.md docs/archived/
mv generate-agents\ \(1\).md docs/archived/
```

**Step 3: Verify move**

```bash
ls -la docs/archived/ | wc -l
# Expected: 25 files (26 + .)
ls -la *.md 2>/dev/null | wc -l
# Expected: 2 (README.md, AGENTS.md only)
```

**Step 4: Commit**

```bash
git add docs/archived/
git commit -m "docs: archive implementation guides and fix logs to docs/archived/"
```

---

## Task 2: Move Orphaned Root Files to src/

**Files:**
- Move: `index.ts` → `src/lib/index.ts`
- Move: `MODERN_LANDING_PAGE.tsx` → `src/components/pages/MODERN_LANDING_PAGE.tsx`
- Move: `metadata.json` → `src/config/metadata.json`

**Step 1: Create src/config/ if needed**

```bash
mkdir -p src/config
```

**Step 2: Move orphaned files**

```bash
mv index.ts src/lib/index.ts
mv MODERN_LANDING_PAGE.tsx src/components/pages/MODERN_LANDING_PAGE.tsx
mv metadata.json src/config/metadata.json
```

**Step 3: Update imports in any files that reference these**

```bash
# Search for references
rg "from ['\"]\.\./(index|MODERN_LANDING_PAGE|metadata)" src/ --type ts --type tsx
```

If found, update imports to use `@/` paths:
- `import x from '@/lib/index'` (if in src/lib)
- `import x from '@/components/pages/MODERN_LANDING_PAGE'`
- `import x from '@/config/metadata'`

**Step 4: Verify no broken imports**

```bash
bunx tsc --noEmit
# Expected: No errors
```

**Step 5: Commit**

```bash
git add src/lib/index.ts src/components/pages/MODERN_LANDING_PAGE.tsx src/config/metadata.json
git commit -m "refactor: move orphaned root files to src/"
```

---

## Task 3: Consolidate Tests to src/test/

**Files:**
- Consolidate: `tests/` → `src/test/`
- Update: `vitest.config.ts`
- Update: `playwright.config.ts`

**Step 1: Check what's in tests/ directory**

```bash
find tests/ -type f -name "*.ts" -o -name "*.tsx" | head -20
ls -la tests/
```

**Step 2: Move all tests from tests/ to src/test/**

```bash
# Backup first
cp -r tests tests.backup

# Copy everything from tests to src/test
cp -r tests/* src/test/

# Verify
find src/test -type f | wc -l
```

**Step 3: Update vitest.config.ts**

```typescript
// Before: look for any test.include or test.exclude patterns
// Update to point to src/test/ if using tests/ pattern

// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['node_modules', 'dist', '.idea', '.git', '.cache'],
  },
});
```

**Step 4: Update playwright.config.ts (if it references tests/)**

```bash
grep -n "testDir\|tests/" playwright.config.ts
```

If found, update testDir to point to `src/test/e2e/` (if E2E tests exist there).

**Step 5: Remove tests/ directory**

```bash
rm -rf tests tests.backup
```

**Step 6: Run tests to verify**

```bash
bun test
# Expected: All tests pass
```

**Step 7: Commit**

```bash
git add src/test/ vitest.config.ts playwright.config.ts
git commit -m "refactor: consolidate tests to src/test/"
```

---

## Task 4: Remove package-lock.json (Bun Project)

**Files:**
- Delete: `package-lock.json`

**Step 1: Remove npm lock file**

```bash
rm package-lock.json
```

**Step 2: Verify bun.lock exists**

```bash
ls -la bun.lock
# Expected: bun.lock exists
```

**Step 3: Add to .gitignore if not already there**

```bash
grep "package-lock.json" .gitignore
# If not present, add it
echo "package-lock.json" >> .gitignore
```

**Step 4: Commit**

```bash
git add .gitignore
git rm --cached package-lock.json
git commit -m "chore: remove npm package-lock.json (using Bun)"
```

---

## Task 5: Simplify tsconfig.json Path Aliases

**Files:**
- Modify: `tsconfig.json`

**Step 1: Simplify redundant path aliases**

Replace:
```json
"paths": {
  "@/*": ["./src/*"],
  "@/components/*": ["./src/components/*"],
  "@/lib/*": ["./src/lib/*"],
  "@/db/*": ["./src/db/*"],
  "@/types/*": ["./src/types/*"]
}
```

With:
```json
"paths": {
  "@/*": ["./src/*"]
}
```

**Step 2: Verify TypeScript still compiles**

```bash
bunx tsc --noEmit
# Expected: No errors
```

**Step 3: Commit**

```bash
git add tsconfig.json
git commit -m "refactor: simplify tsconfig path aliases"
```

---

## Task 6: Remove Webpack Flag from package.json Scripts

**Files:**
- Modify: `package.json`

**Step 1: Remove --webpack flags**

Change:
```json
"scripts": {
  "dev": "bun --bun next dev --webpack",
  "build": "bun --bun next build --webpack",
```

To:
```json
"scripts": {
  "dev": "bun --bun next dev",
  "build": "bun --bun next build",
```

**Step 2: Test dev server starts**

```bash
timeout 30 bun dev &
# Should start without webpack-specific warnings
sleep 5
pkill -f "next dev"
# Expected: No webpack flag errors
```

**Step 3: Test build completes**

```bash
bun build
# Expected: Build completes successfully
```

**Step 4: Commit**

```bash
git add package.json
git commit -m "chore: remove legacy webpack flags from Next.js scripts"
```

---

## Task 7: Final Verification

**Files:**
- Verify all changes

**Step 1: Run full type check**

```bash
bunx tsc --noEmit
# Expected: No errors
```

**Step 2: Run linter**

```bash
bun lint
# Expected: No errors (fix if minor issues)
```

**Step 3: Run test suite**

```bash
bun test
# Expected: All tests pass
```

**Step 4: Verify build**

```bash
bun build
# Expected: Build succeeds
```

**Step 5: Check git status**

```bash
git status
# Expected: Clean working directory
```

**Step 6: Final commit message**

```bash
git log --oneline | head -7
# Should show the 7 cleanup commits
```

**Step 7: Create cleanup summary commit (optional)**

```bash
git commit --allow-empty -m "build: complete project structure cleanup

- Archive 26 implementation guides to docs/archived/
- Move orphaned files (index.ts, metadata.json, MODERN_LANDING_PAGE.tsx) to src/
- Consolidate tests to src/test/
- Remove npm package-lock.json (Bun-only project)
- Simplify tsconfig path aliases
- Remove legacy webpack flags from Next.js scripts"
```

---

## Rollback Plan

If any task breaks functionality:

```bash
# Revert last commit
git reset --hard HEAD~1

# Or restore from backup
cp -r tests.backup tests/  # If needed
```

---

## Success Criteria

- ✅ Root directory contains only config and essential files
- ✅ All orphaned files moved to src/
- ✅ Tests consolidated under src/test/
- ✅ No package-lock.json in repo
- ✅ TypeScript compiles without errors
- ✅ All tests pass
- ✅ Build succeeds
- ✅ Dev server starts cleanly
