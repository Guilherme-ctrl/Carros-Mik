# Supabase Surface — Shared Backend Contract

> Documentation only (see `README.md`). Sourced from the reverse-engineered
> API docs: `aidlc/spaces/default/codekb/mobile/api-documentation.md` and
> `aidlc/spaces/default/codekb/web/api-documentation.md`. Authoritative
> schema lives in `supabase/` (migrations + functions) — if this disagrees
> with `supabase/`, `supabase/` wins.

Both `apps/flutter_app/` (Flutter, via `supabase_flutter`) and
`apps/web_app/` (React, via `@supabase/supabase-js`) call the **same**
Supabase project directly. Neither app imports the other; there is no
shared client. `primary_files` lists one representative calling site per
consuming app (paths are relative to that app's root).

- flutter_app backend access is isolated to `*_remote_datasource.dart`
  files under `lib/features/<feature>/data/datasources/`.
- web_app backend access lives in feature hooks (`use<Resource>.ts`) and
  a few components, over the single client singleton `src/lib/supabase.ts`.

> **Multi-car missions (migration `20260811000001_multi_car_missions.sql`).**
> A mission can now hold several cars at once. The backend for that shipped
> ahead of the two app changes, so entries marked **planned consumer** exist
> in the database but are not called by either app yet — `apps/web_app/`
> (unit U2) and `apps/flutter_app/` (unit U3) wire them up next. Objects
> marked **deprecated** stay callable until those app deploys land.

## Postgres Tables

| name | kind | purpose | consumers | primary_files |
|---|---|---|---|---|
| `user_roles` | table | Role gate on login (`select role by user_id`); absence throws "Acesso não configurado" (mobile) | both | flutter_app: `lib/features/auth/data/datasources/auth_remote_datasource.dart` · web_app: `src/features/auth/useAuth.ts` |
| `requests` | table | Mission/request records: list, insert, update, cancel, status/outcome writes; realtime-subscribed. **`status` is now the 5-value `request_status_v2`** (`open, under_review, car_assigned, completed, cancelled`); per-car progress moved to `request_cars.status`. **`outcome` is trigger-derived**, not client-written. **`assigned_car_id` is frozen** — a pre-cutover snapshot no code writes any more. | both | flutter_app: `lib/features/missions/data/datasources/missions_remote_datasource.dart` · web_app: `src/features/requests/useRequests.ts` |
| `request_cars` | table | **New.** One row per car assigned to a mission: per-car `status` and `outcome`, `assigned_at` / `removed_at` / `removal_reason`. Rows are never deleted — a removed, transferred or mission-closed car keeps its row with `removed_at` set. A partial unique index (`car_id` where `removed_at IS NULL`) is what guarantees a car is never on two missions at once. Realtime-subscribed. | planned: both | — (U2/U3) |
| `request_comments` | table | Mission comment thread: select + insert; realtime-subscribed | both | flutter_app: `lib/features/missions/data/datasources/missions_remote_datasource.dart` · web_app: `src/features/requests/useComments.ts` |
| `notifications` | table | In-app notification list + mark-as-read (`read_at`); realtime-subscribed. `type` gained `mission_composition_changed` and `mission_removed`. | both | flutter_app: `lib/features/notifications/data/datasources/notifications_remote_datasource.dart` · web_app: `src/features/notifications/useNotifications.ts` |
| `cars` | table | Cars: mobile resolves the signed-in driver's car (`select id by driver_user_id`); web does full CRUD; realtime-subscribed on web. `operational_status` is no longer written by assignment RPCs — a trigger derives it from `request_cars`. Deleting a car that has ever been assigned is now blocked (`ON DELETE RESTRICT`). | both | flutter_app: `lib/features/missions/data/datasources/missions_remote_datasource.dart` · web_app: `src/features/cars/useCars.ts` |
| `push_tokens` | table | FCM push-token registration/refresh (`upsert user_id/push_token/updated_at`) | flutter_app | flutter_app: `lib/features/auth/data/datasources/auth_remote_datasource.dart` |
| `leaders` | table | Leaders directory: select/insert/update/delete | web_app | web_app: `src/features/leaders/useLeaders.ts` |
| `car_locations` | table | GPS location reads for the live map; realtime-subscribed. (Mobile does not read this table directly — it *writes* location via the `upsert_car_location` RPC.) Visibility is deliberately **unchanged**: still central-only, drivers see no one's location. | web_app | web_app: `src/features/dashboard/useCarLocations.ts` |
| `request_history` | table | Mission status/assignment history timeline; realtime-subscribed. New columns: `car_id`, `event_type` (`status_changed` \| `car_added` \| `car_removed`), `removal_reason`. `from_status`/`to_status` keep the legacy 8-value `request_status` enum so historical rows are not rewritten, and car events populate them with the request-level status before/after the event. | web_app | web_app: `src/features/requests/RequestTimeline.tsx` |
| `profiles` | view | User display info joined into the request timeline | web_app | web_app: `src/features/requests/RequestTimeline.tsx` |

## Postgres RPCs

| name | kind | purpose | consumers | primary_files |
|---|---|---|---|---|
| `add_cars_to_request` | rpc | **New.** `(p_request_id UUID, p_car_ids UUID[]) RETURNS SETOF request_cars`. Assigns several cars in one transaction — all or nothing. Raises `car_busy_needs_confirmation` (DETAIL is JSON: `{car_id, request_id}`) if any car already has an active assignment, and inserts nothing. Mesa Central only. | planned: web_app | — (U2) |
| `add_car_to_request` | rpc | **New.** `(p_request_id UUID, p_car_id UUID) RETURNS request_cars`. Single incremental add; same busy contract as the batch RPC. Mesa Central only. | planned: web_app | — (U2) |
| `confirm_transfer_car_to_request` | rpc | **New.** `(p_request_id UUID, p_car_id UUID) RETURNS request_cars`. The explicit second step after `car_busy_needs_confirmation`: closes the car's active row on its current mission (`removal_reason = 'transferred'`), opens a new one here, writes a history row per mission, and reverts the origin to `open` if that was its last car. Errors if the car is no longer busy. Mesa Central only. | planned: web_app | — (U2) |
| `remove_car_from_request` | rpc | **New.** `(p_request_id UUID, p_car_id UUID) RETURNS VOID`. Closes the active row (`removal_reason = 'removed'`) and returns the mission to `open` if it was the last car. Mesa Central only. | planned: web_app | — (U2) |
| `update_car_status` | rpc | **New.** `(p_request_id UUID, p_car_id UUID, p_new_status car_status) RETURNS VOID`. Per-car progress: `car_assigned → on_the_way → on_site → returning`, no skipping and no going back. Callable by the car's own driver or by Mesa Central. | planned: flutter_app | — (U3) |
| `report_car_outcome` | rpc | **New.** `(p_request_id UUID, p_car_id UUID, p_outcome request_outcome) RETURNS VOID`. Symmetric for `found` and `not_found`; the car's own driver only; rejects a second report. Does not close the mission itself — a trigger does that once every active car has reported (`found` wins the aggregate). | planned: flutter_app | — (U3) |
| `update_request_status` | rpc | Governed mission status transition, **narrowed**: only `open ↔ under_review` and `→ cancelled` are accepted. Passing `car_assigned`, `completed`, `on_the_way`, `on_site` or `returning` now raises an error naming the RPC to use instead. Cancelling also closes any active `request_cars` rows so the cars are released. Signature is unchanged — `(p_request_id, p_new_status[, p_notes])`, 3rd arg optional server-side. | both | flutter_app: `lib/features/missions/data/datasources/missions_remote_datasource.dart` · web_app: `src/features/requests/useUpdateStatus.ts` |
| `upsert_car_location` | rpc | GPS location upload `(p_car_id, p_latitude, p_longitude, p_accuracy, p_recorded_at)` | flutter_app | flutter_app: `lib/features/location/data/datasources/location_remote_datasource.dart` |
| `assign_car_to_request` | rpc | **Deprecated** (kept callable for one deployment cycle). Single-car assign that writes `requests.assigned_car_id`; does **not** create a `request_cars` row, so the new model does not see it. Its "steal a busy car" branch no longer works after the status enum narrowing — see the caveat below. Replaced by `add_car_to_request` + `confirm_transfer_car_to_request`. | web_app | web_app: `src/features/assignment/useAssignCar.ts` |
| `reassign_car` | rpc | **Deprecated**, same caveats as `assign_car_to_request`. Replaced by `remove_car_from_request` + `add_car_to_request`. | web_app | web_app: `src/features/assignment/useAssignCar.ts` |
| `set_mission_outcome_found` | rpc | **Deprecated.** Single-car `found` path. Replaced by `report_car_outcome`. | — (called by the `set-mission-outcome` edge function) | — |
| `is_valid_transition` | rpc | **Deprecated.** The legacy 8-value transition table, kept because the deprecated RPCs above still use it. Superseded by `is_valid_request_transition` and `is_valid_car_status_transition`. | — | — |
| `get_driver_users` | rpc | List users eligible to be drivers `()` | web_app | web_app: `src/features/cars/useCars.ts` |
| `debug_auth_uid` | rpc | **Debug-only** — logs server-side `auth.uid()`; called on every `StartLocationTracking`. Flagged as debug noise in the code-quality assessment. | flutter_app | flutter_app: `lib/features/location/data/datasources/location_remote_datasource.dart` |

> **Deprecated-RPC caveat.** `assign_car_to_request` and `reassign_car` filter
> on `requests.status IN ('car_assigned','on_the_way','on_site','returning')`
> inside their busy-car branch. Those three in-flight values no longer exist on
> `requests.status`, so that branch raises `invalid input value for enum
> request_status_v2: "on_the_way"`. Assigning an **available** car through
> either RPC still works; taking a car off another mission through them does
> not. Use `confirm_transfer_car_to_request` for that.

## Edge Functions

| name | kind | purpose | consumers | primary_files |
|---|---|---|---|---|
| `set-mission-outcome` | edge-function | **Deprecated for the outcome flow.** Atomically sets `outcome=found` + `status=completed`, releases the car, writes history (HTTP 200 checked). Superseded by the `report_car_outcome` RPC, which is symmetric across both outcomes and carries the car dimension. | flutter_app | flutter_app: `lib/features/missions/data/datasources/missions_remote_datasource.dart` |
| `create-user` | edge-function | Admin-provisioned user creation | web_app | web_app: `src/features/users/useUsers.ts` |
| `list-users` | edge-function | List all users | web_app | web_app: `src/features/users/useUsers.ts` |
| `update-user-role` | edge-function | Change a user's role | web_app | web_app: `src/features/users/useUsers.ts` |
| `deactivate-user` | edge-function | Deactivate a user account | web_app | web_app: `src/features/users/useUsers.ts` |

## Row-Level Security worth knowing about

Only the policies a client author is likely to trip over; the full set lives in
`supabase/migrations/`.

| table | policy | effect |
|---|---|---|
| `request_cars` | `request_cars_select_central` | Central staff read every row. |
| `request_cars` | `request_cars_select_leader` | A leader reads the rows of their own requests. |
| `request_cars` | `request_cars_select_driver_shared` | A driver reads **every** car's row on a mission they are actively on — this is the shared roster. Identification only; it does not widen `car_locations`. |
| `request_cars` | `request_cars_outcome_driver` | A driver may UPDATE only their own active row. |
| `request_comments` | `comments_insert_driver` | Rewritten to follow `request_cars` instead of `requests.assigned_car_id`, so every co-assigned driver can comment — previously only the single `assigned_car_id` driver could. |
| `requests` | `requests_outcome_driver` | **Removed.** Drivers no longer write to `requests`; they write their own `request_cars` row. |

## Backend objects not called by either client

The Supabase backend also ships these, which neither app invokes directly
— they are database-webhook / trigger driven and listed here for
completeness only (no app is a `consumer`):

| name | kind | notes |
|---|---|---|
| `on-car-assignment-changed` | edge-function | **New (ADR-6).** Fires on `request_cars` INSERT and on `removed_at` being set with a `removal_reason`. Pushes `mission_assigned` / `mission_removed` to the car's driver and `mission_composition_changed` to every other driver still on the mission. Mission *closure* sets `removed_at` with a NULL reason and deliberately does not notify. Deploy with `--no-verify-jwt`, like the other webhook functions. |
| `on-outcome-set` | edge-function | Webhook/trigger-driven side effects after an outcome is set |
| `on-request-assigned` | edge-function | Webhook/trigger-driven side effects after a car is assigned. Now only fires when `requests.assigned_car_id` actually changes, i.e. only for the deprecated RPC path; `on-car-assignment-changed` covers the new one. |
| `on-status-updated` | edge-function | Webhook/trigger-driven side effects after a status change |
| `update-car-status` | edge-function | Backend car-status maintenance (not invoked by either client) |

## Realtime publication

`supabase_realtime` is table-specific on this project (not `FOR ALL TABLES`),
and membership is managed in migrations — `supabase/config.toml` carries no
table list. Published tables: `requests`, `request_cars`, `request_history`,
`request_comments`, `notifications`, `cars`, `car_locations`. All are set to
`REPLICA IDENTITY FULL` so UPDATE payloads carry the full row.
