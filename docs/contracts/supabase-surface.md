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

## Postgres Tables

| name | kind | purpose | consumers | primary_files |
|---|---|---|---|---|
| `user_roles` | table | Role gate on login (`select role by user_id`); absence throws "Acesso não configurado" (mobile) | both | flutter_app: `lib/features/auth/data/datasources/auth_remote_datasource.dart` · web_app: `src/features/auth/useAuth.ts` |
| `requests` | table | Mission/request records: list, insert, update, cancel, status/outcome writes; realtime-subscribed | both | flutter_app: `lib/features/missions/data/datasources/missions_remote_datasource.dart` · web_app: `src/features/requests/useRequests.ts` |
| `request_comments` | table | Mission comment thread: select + insert; realtime-subscribed | both | flutter_app: `lib/features/missions/data/datasources/missions_remote_datasource.dart` · web_app: `src/features/requests/useComments.ts` |
| `notifications` | table | In-app notification list + mark-as-read (`read_at`); realtime-subscribed | both | flutter_app: `lib/features/notifications/data/datasources/notifications_remote_datasource.dart` · web_app: `src/features/notifications/useNotifications.ts` |
| `cars` | table | Cars: mobile resolves the signed-in driver's car (`select id by driver_user_id`); web does full CRUD; realtime-subscribed on web | both | flutter_app: `lib/features/missions/data/datasources/missions_remote_datasource.dart` · web_app: `src/features/cars/useCars.ts` |
| `push_tokens` | table | FCM push-token registration/refresh (`upsert user_id/push_token/updated_at`) | flutter_app | flutter_app: `lib/features/auth/data/datasources/auth_remote_datasource.dart` |
| `leaders` | table | Leaders directory: select/insert/update/delete | web_app | web_app: `src/features/leaders/useLeaders.ts` |
| `car_locations` | table | GPS location reads for the live map; realtime-subscribed. (Mobile does not read this table directly — it *writes* location via the `upsert_car_location` RPC.) | web_app | web_app: `src/features/dashboard/useCarLocations.ts` |
| `request_history` | table | Mission status/assignment history timeline; realtime-subscribed | web_app | web_app: `src/features/requests/RequestTimeline.tsx` |
| `profiles` | view | User display info joined into the request timeline | web_app | web_app: `src/features/requests/RequestTimeline.tsx` |

## Postgres RPCs

| name | kind | purpose | consumers | primary_files |
|---|---|---|---|---|
| `update_request_status` | rpc | Governed mission status transition. **Signature differs by caller:** mobile calls `(p_request_id, p_new_status)`; web calls `(p_request_id, p_new_status, p_notes)` — the 3rd arg is optional server-side. | both | flutter_app: `lib/features/missions/data/datasources/missions_remote_datasource.dart` · web_app: `src/features/requests/useUpdateStatus.ts` |
| `upsert_car_location` | rpc | GPS location upload `(p_car_id, p_latitude, p_longitude, p_accuracy, p_recorded_at)` | flutter_app | flutter_app: `lib/features/location/data/datasources/location_remote_datasource.dart` |
| `assign_car_to_request` | rpc | Assign a car to a request `(p_request_id, p_car_id)` | web_app | web_app: `src/features/assignment/useAssignCar.ts` |
| `reassign_car` | rpc | Reassign a request to a different car `(p_request_id, p_new_car_id)` | web_app | web_app: `src/features/assignment/useAssignCar.ts` |
| `get_driver_users` | rpc | List users eligible to be drivers `()` | web_app | web_app: `src/features/cars/useCars.ts` |
| `debug_auth_uid` | rpc | **Debug-only** — logs server-side `auth.uid()`; called on every `StartLocationTracking`. Flagged as debug noise in the code-quality assessment. | flutter_app | flutter_app: `lib/features/location/data/datasources/location_remote_datasource.dart` |

## Edge Functions

| name | kind | purpose | consumers | primary_files |
|---|---|---|---|---|
| `set-mission-outcome` | edge-function | Atomically sets `outcome=found` + `status=completed`, releases the car, writes history (HTTP 200 checked). Edge Function only — there is no RPC by this name in either app's surface. | flutter_app | flutter_app: `lib/features/missions/data/datasources/missions_remote_datasource.dart` |
| `create-user` | edge-function | Admin-provisioned user creation | web_app | web_app: `src/features/users/useUsers.ts` |
| `list-users` | edge-function | List all users | web_app | web_app: `src/features/users/useUsers.ts` |
| `update-user-role` | edge-function | Change a user's role | web_app | web_app: `src/features/users/useUsers.ts` |
| `deactivate-user` | edge-function | Deactivate a user account | web_app | web_app: `src/features/users/useUsers.ts` |

## Backend objects not called by either client

The Supabase backend also ships these, which neither app invokes directly
— they are database-webhook / trigger driven and listed here for
completeness only (no app is a `consumer`):

| name | kind | notes |
|---|---|---|
| `on-outcome-set` | edge-function | Webhook/trigger-driven side effects after an outcome is set |
| `on-request-assigned` | edge-function | Webhook/trigger-driven side effects after a car is assigned |
| `on-status-updated` | edge-function | Webhook/trigger-driven side effects after a status change |
| `update-car-status` | edge-function | Backend car-status maintenance (not invoked by either client) |
