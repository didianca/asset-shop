# Asset Shop — Claude Instructions

## General Rules

- **Always run `npm install` from the project root** — never `cd` into a subdirectory first. The root manages a single `package-lock.json` for the entire monorepo. Use the `-w` flag to target a specific workspace. Example: `npm install <package> -w api`

## Before Every Commit

When a feature is completed, always do the following before committing:

### 1. Update README
- Reflect any new scripts, dependencies, or stack changes
- Update the file structure tree if files were added or removed

### 2. Update Tests (Backend)
- Add or update tests in `api/tests/` to cover the new feature
- Ensure coverage stays at or above 95% by running `npm run test:coverage`
- Test file structure must mirror `api/src/`
- Use integration tests against a real test database (`asset_shop_test`), not Prisma mocks
- Add Prisma-related tests as each service is built — not upfront

### 3. Update .gitignore
- Add any new build artifacts, environment files, or generated files that should not be committed

### 4. Update and Generate Swagger Docs (Backend)
- Add or update `@openapi` JSDoc comments on any new or modified routes in `backend/src/`
- Define new response schemas under `components/schemas`
- Verify the Swagger UI looks correct at `http://localhost:3000/api-docs` before committing
