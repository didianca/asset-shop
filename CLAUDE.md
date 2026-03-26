# Asset Shop — Claude Instructions

## Before Every Commit

When a feature is completed, always do the following before committing:

### 1. Update README
- Reflect any new scripts, dependencies, or stack changes
- Update the file structure tree if files were added or removed

### 2. Update Tests (Backend)
- Add or update tests in `backend/tests/` to cover the new feature
- Ensure coverage stays at or above 95% by running `npm run test:coverage`
- Test file structure must mirror `backend/src/`

### 3. Update .gitignore
- Add any new build artifacts, environment files, or generated files that should not be committed

### 4. Update and Generate Swagger Docs (Backend)
- Add or update `@openapi` JSDoc comments on any new or modified routes in `backend/src/`
- Define new response schemas under `components/schemas`
- Verify the Swagger UI looks correct at `http://localhost:3000/api-docs` before committing
