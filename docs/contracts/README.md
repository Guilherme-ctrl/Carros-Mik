# packages/contracts

**Documentation only. This directory contains no runtime code — ever.**

`packages/contracts/` is a hand-written, human-readable reference of the
**shared Supabase backend surface** (Postgres tables, RPCs, and Edge
Functions) that `apps/flutter_app/` and `apps/web_app/` each call
independently. Both apps talk to the same Supabase project, but neither
imports the other and there is no shared client library between them.

## What this directory is

- A single source of truth describing *which* backend objects exist and
  *which app touches each one*, so a developer can reason about a schema
  or RPC change without opening both apps' source trees.
- Reference material for review and onboarding.

## What this directory is NOT

- **Not** Dart code. **Not** TypeScript code. **Not** any other runtime code.
- **Not** a generated client, generated types, or a code-generation target.
- **Not** importable by `apps/flutter_app/` or `apps/web_app/`. Nothing
  here is a build dependency of either app. Deleting this directory must
  not affect either app's build.

Generated-client / shared-type tooling is **explicitly deferred** — it is
not part of the current repository structure. See
`docs/adr/0002-packages-contracts-docs-only.md` for the rationale.

## Contents

| File | Purpose |
|---|---|
| `supabase-surface.md` | Table of every backend object (table / RPC / edge function), what it does, which app(s) consume it, and a representative calling file per app. |

## Authoritative schema

The actual, executable schema lives in `supabase/` at the repository root
(migrations and edge functions). If this document and `supabase/` ever
disagree, **`supabase/` wins** — update this document to match.
