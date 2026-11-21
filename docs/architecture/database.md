# Practice database: owner note

## What it is for
The shared memory for an architecture practice. Projects, the seven stages, tasks, documents, approvals, RFIs, site visits, variations, defects and an activity log. Everyone in the firm sees the same work. Nobody outside can.

It is written for Supabase. Every table sits in its own schema, `arch`, so it cannot clash with anything else.

## The tables
| Table | Holds |
|---|---|
| practice, practice_member | The firm, and who belongs (owner, member, viewer) |
| project | One job, with site and model details |
| stage | The seven stages and their status |
| task, document, rfi | Day-to-day work |
| observation, variation, defect | Site visits, changes, faults |
| approval, activity | Sign-offs and a log. Never changed after |

## Who can see what
- Signed-in people see only their own practice's rows.
- Owners and members can add and change records. Viewers only read.
- Only owners manage membership.
- `anon` (not signed in) gets nothing.
- Approvals and activity can be added and read. Only `service_role`, the server-side key, can change or delete them.
- An approval keeps the signed-in account id as well as the typed name.
- A stage cannot be marked done unless an approval exists for that project and stage. A database trigger enforces this, for everyone including `service_role`.
- Site latitude and longitude are private project data, as the column comments say.

## What was proven, and how
I ran the migrations on a throwaway in-memory database (PGlite) on this machine, with small stand-ins for the Supabase parts: the `auth` schema, `auth.uid()` and the three roles. This was not Supabase. Nothing was applied or deployed anywhere.

The migrations ran twice with no error and no change. Thirteen checks passed: a member creating and reading a project, another firm seeing nothing, a viewer unable to write, `anon` refused, approvals unchangeable, and a stage refusing `done` until approved. I also broke two rules on purpose and the checks failed, as they should.

Run them with `node --test tests/architecture-db/*.test.mjs` (after `npm install` in that folder).

## Where it is now (22 November 2026)
The three migrations are applied to the `assembl-prod` Supabase project, in the separate `arch` schema, on Kate's instruction. Nothing outside `arch` was touched. A catalogue check on production matched the dry run exactly: 12 tables, all with row level security on, 86 columns, 43 policies, 6 triggers, 10 functions, 22 indexes, and no access for `anon`. The tables are empty.

Status: connected, not yet verified in use. No app reads or writes it yet.

## Still to do before it is real
1. Add `arch` to the exposed schemas in the API settings. Until then nothing outside the database can reach it.
2. Decide how people sign in and how colleagues are invited.
3. Connect the app in place of browser storage. Site and model fields are flat, for example `site_lat`, `model_fingerprint`.
4. Re-run the thirteen checks against production with test accounts.

## Risks
- The access rules were proven on stand-ins, not yet with real accounts on production. See step 4.
- Ids are database-made uuids. Tell me if the app makes its own.
- Adding a colleague needs their account id; an invite flow is still to build. Nothing stops the last owner leaving.
- A project with approvals or activity cannot be deleted by users. That is deliberate.
- AI wrote this. A person should read the rules before real client data goes in.
