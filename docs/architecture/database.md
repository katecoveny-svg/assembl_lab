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

## Still to do before it is real
1. Choose a Supabase project, or create a new one.
2. Apply the three migrations in `supabase/migrations/`.
3. Add `arch` to the exposed schemas in the API settings.
4. Turn on sign-in.
5. Connect the app. Site and model fields are flat, for example `site_lat`, `model_fingerprint`.
6. Re-run the checks against that project.

## Risks
- Real Supabase differs from the stand-ins in small ways. It is unproven there until step 6.
- Ids are database-made uuids. Tell me if the app makes its own.
- Adding a colleague needs their account id. An invite flow is still to build.
- Nothing stops the last owner leaving.
- A project with approvals or activity cannot be deleted by users. That is deliberate.
- AI wrote this. A person should read the rules before real client data goes in.
