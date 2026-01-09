# Drizzle Migrations Guide

This guide covers how to manage database migrations with Drizzle ORM for both development and production environments.

## Table of Contents

- [Quick Start](#quick-start)
- [Development Workflow](#development-workflow)
- [Production Workflow](#production-workflow)
- [Migration Commands](#migration-commands)
- [Troubleshooting](#troubleshooting)

## Quick Start

### Available Commands

Add these scripts to your `package.json`:

```json
{
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio"
  }
}
```

## Development Workflow

### Method 1: Using `drizzle-kit push` (Recommended for Development)

Use this for rapid development and prototyping:

```bash
# Make changes to src/db/schema.ts
# Then sync directly to database
npm run db:push
```

**Advantages:**
- ✅ Fast iteration
- ✅ No migration files to manage
- ✅ Perfect for local development

**When to use:**
- Local development
- Rapid prototyping
- Testing schema changes

### Method 2: Using Migrations

```bash
# 1. Make changes to src/db/schema.ts

# 2. Generate migration file
npm run db:generate

# 3. Apply migration
npm run db:migrate
```

## Production Workflow

**⚠️ IMPORTANT:** Always use migrations for production, never `drizzle-kit push`!

### Initial Setup: Create Baseline Migration

Since your database is already set up, create a baseline:

```bash
# Generate initial migration from current schema
npx drizzle-kit generate
```

This creates `drizzle/0000_*.sql` representing your current schema state.

### Marking Baseline as Applied (For Existing Databases)

If your production database already has tables:

**Option 1: Manual Insert**
```sql
-- Insert into drizzle migrations table to mark as applied
INSERT INTO "__drizzle_migrations" (hash, created_at)
VALUES ('your_migration_hash', NOW());
```

**Option 2: Custom Script**
Create a script to mark migrations as applied without running them.

### Future Schema Changes

**1. Development:**
```bash
# Edit src/db/schema.ts
# Generate migration
npm run db:generate

# Test locally (optional)
npm run db:push  # or npm run db:migrate

# Commit migration file to git
git add drizzle/
git commit -m "Add new migration"
```

**2. Production Deployment:**
```bash
# In your CI/CD pipeline or deployment script
npm run db:migrate
```

## Migration Commands

### `drizzle-kit generate`

Generates SQL migration files based on schema changes.

```bash
npx drizzle-kit generate
```

**Output:** Creates new migration files in `drizzle/` folder with format `0000_name.sql`

### `drizzle-kit migrate`

Applies pending migrations to the database.

```bash
npx drizzle-kit migrate
```

**Use for:**
- Production deployments
- Staging environments
- When you need audit trail

### `drizzle-kit push`

Directly syncs schema to database without creating migration files.

```bash
npx drizzle-kit push
```

**Use for:**
- Local development only
- Rapid prototyping
- ⚠️ Never use in production!

### `drizzle-kit studio`

Opens Drizzle Studio web UI for database management.

```bash
npx drizzle-kit studio
```

## Configuration

The Drizzle configuration is in `drizzle.config.ts`:

```typescript
import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  out: './drizzle',
  schema: './src/db/schema.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

## Schema Best Practices

### Foreign Key Constraints

When referencing columns in foreign keys, ensure they have unique constraints:

```typescript
// ✅ Good - alias has unique constraint
export const brand = pgTable("brand", {
  id: text().primaryKey(),
  alias: text().notNull().unique(), // Used as FK target
});

export const item = pgTable("item", {
  brandSlug: text(),
}, (table) => [
  foreignKey({
    columns: [table.brandSlug],
    foreignColumns: [brand.alias], // References unique column
  })
]);
```

```typescript
// ❌ Bad - alias has no unique constraint
export const brand = pgTable("brand", {
  id: text().primaryKey(),
  alias: text().notNull(), // Missing .unique()
});
```

### Required Unique Constraints

Ensure these columns have `.unique()`:
- `brand.alias` (referenced by `item.brandSlug`)
- `item.articleId` (referenced by `itemDetails.itemSlug`, `itemPrice.itemSlug`, etc.)
- `warehouse_countries.slug` (referenced by `warehouse.countrySlug`)
- `category.slug` (referenced by various tables)
- `subcategories.slug` (referenced by translations)

## Troubleshooting

### Error: "there is no unique constraint matching given keys"

**Problem:** Foreign key references a column without a unique constraint.

**Solution:** Add `.unique()` to the referenced column:

```typescript
// Before
alias: text().notNull(),

// After
alias: text().notNull().unique(),
```

Then regenerate migrations:
```bash
rm -rf drizzle/*.sql drizzle/meta
npx drizzle-kit generate
```

### Error: "unterminated /* comment"

**Problem:** Migration file from database introspection has commented-out SQL.

**Solution:** Delete the introspection file (usually `0000_*.sql`) and generate fresh migrations.

### Database Out of Sync

**Problem:** Database schema doesn't match your code schema.

**Solution:**
```bash
# For development - force sync
npx drizzle-kit push

# For production - use migrations
npx drizzle-kit generate
npx drizzle-kit migrate
```

### Starting Fresh

If migrations are completely broken:

```bash
# 1. Backup your database first!

# 2. Remove all migrations
rm -rf drizzle/*.sql drizzle/meta

# 3. Generate fresh baseline
npx drizzle-kit generate

# 4. For dev: sync directly
npx drizzle-kit push

# 5. For prod: mark baseline as applied (see above)
```

## CI/CD Integration

### Example GitHub Actions

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run migrations
        run: npm run db:migrate
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
      
      - name: Deploy application
        run: npm run deploy
```

## Summary

| Environment | Command | Files Tracked | Use Case |
|------------|---------|---------------|----------|
| **Development** | `npm run db:push` | ❌ No | Fast iteration |
| **Staging** | `npm run db:migrate` | ✅ Yes | Pre-production testing |
| **Production** | `npm run db:migrate` | ✅ Yes | Deployments |

**Key Principles:**
- ✅ Always use migrations for production
- ✅ Keep migration files in version control
- ✅ Test migrations in staging before production
- ✅ Never modify existing migration files
- ✅ Use `push` only in development for speed

---

For more information, see the [Drizzle Kit documentation](https://orm.drizzle.team/kit-docs/overview).
