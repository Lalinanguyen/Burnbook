# CLAUDE.md — src/shared/

This layer is framework-agnostic and has no UI dependencies. Rules here override parent CLAUDE.md for any work scoped to this directory.

## Constraints

- No React imports. No JSX. No component code.
- No `chrome.*` API calls — shared code must be environment-agnostic and testable outside the extension context.
- No direct DOM manipulation.

## encryption.ts

Do not modify without explicit instruction. Any change to key derivation (PBKDF2 iterations, salt strategy) or AES parameters silently breaks existing encrypted data for users. This is a one-way door.

## LocalDB.ts

All writes must set `localModified: true`. This is the sync flag for future cloud backup — skipping it silently breaks the sync contract even though no sync exists yet.

## Types vs Models

- `types/` — plain interfaces only, no logic
- `models/` — business logic that wraps types; keep methods pure where possible
