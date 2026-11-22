# Practice database: owner note

## What it is for
The shared memory for an architecture practice: projects, stages, tasks, documents, approvals, checklists, files and an activity log. Everyone in the practice sees the same work. Nobody outside can. It is on Supabase, in its own schema, `arch`.

## Where it is now (22 November 2026)
- Applied to production: the first three migrations (twelve tables, empty).
- Written and tested, **not applied**: three more migrations, Google sign-in, the page's shared store.
- The page saves in one browser until the steps below are done. Its banner says so.

## What is added
| File (apply in this order) | Adds |
|---|---|
| `20261122100000_arch_extra_checklist.sql` | An `extra` column on every table, so fields the database does not know yet survive. Checklists. Row order. A database-stamped time on approvals and activity. |
| `20261122100100_arch_invitations_owner_guard.sql` | Invitations, the people list, leaving a practice, and the last-owner rule. |
| `20261122100200_arch_files_storage.sql` | File records (one per kept file: its project, whether it is for a document or the plan model, and which), a private bucket `arch-files` (50 MB a file), and its access rules. |

Only the third file changes anything outside `arch`: one bucket row and four rules on Supabase's storage tables, limited to that bucket. The second reads Supabase's sign-in tables and changes nothing.

## The two switches (owner, in the Supabase dashboard)
Do these after the migrations are applied. Menu names may differ.

**1. Let the page reach `arch`.**
1. Open the project. Go to Project Settings, then Data API.
2. Find "Exposed schemas". Add `arch`. Save.

**2. Let sign-in come back to the page.**
1. Go to Authentication, then URL Configuration.
2. Under "Redirect URLs", add `https://lab.assembl.co.nz/architecture/`. Save.

Then open the page, sign in with Google and start the practice. Until switch 1 is on, the page says "Shared records are not switched on yet".

## Who can see what
- Not signed in, or not in the practice: nothing, rows or files.
- Viewer: reads everything, changes nothing.
- Member: adds and changes records and files.
- Owner: also invites people, sets roles and removes people.
- An invitation names an email address. Nothing is emailed. The person is added only when Google has verified that address for their sign-in.
- The last owner cannot leave, be removed or be demoted.
- Approvals and activity are added, never changed. A project that has them cannot be deleted.
- The Sample stays in the browser. Projects move up only when someone ticks them.
- The site point is private to the practice. Requests to the shared records carry it in their body, not in their address. To look up the public maps, the page sends it to the lab's live feed in that feed's address (the feed takes query parameters only). The feed does not store it, apart from a short-lived cache of its answer. The point is not put in a share link or printed.
- Sign-in: Supabase's client keeps the sign-in (its access and refresh tokens) in this browser's local storage, under `assembl.architecture.auth`, as it normally does. Signing out removes it.
- Files: the contents go in the private bucket under `<practice>/<project>/<file id>` (ids only, never the file's name); the record of each goes in `arch.file`. A shared file is never written over: keeping a new version keeps a new file.

## What is proven
Locally, with stand-ins:
- Database rules: 34 checks on an in-memory Postgres (PGlite), all six migrations run twice (and a third time with data in). Run `node --test tests/architecture-db/*.test.mjs`.
- Page code: 110 checks against a fake of Supabase's client, no network, including files in the browser store's own shapes, moving a project with files up, export and import with files, and the 3D hand-over from the shared records. Run `node --test tests/architecture/*.test.mjs`.
- Screens: a test-browser click-through at 1400x900 and 390x844 with the real Supabase client talking to a stand-in for Supabase's addresses: files kept, downloaded byte for byte, a model opened in 3D from each store, a browser project with files moved up, a viewer's export. Stills: `int-*` (kept outside the repo).

## What is not proven
- No real Google sign-in has been made.
- The page has not used the real database.
- Supabase Storage was not exercised: the bucket's access rules were tested on a stand-in table, and the page's uploads, downloads and removals only against stand-ins.

## Risks
- Check on production that the database owner can read `auth.identities` and `auth.users`. If not, invitations fail safely: nobody is added.
- A whole-project save is several requests; if one fails part-way, the page says so. If two people edit one record at once, the last save wins.
- A file is kept before the record that points at it is saved, so `arch.file` has no foreign key to the document. If the save then fails, the file stays without a record pointing at it; the page removes a document's file when it removes the document.
- Shared files can be up to 50 MB; a browser keeps up to 25 MB. A larger shared file exported with the files is counted as not kept when that project file is imported into a browser.
- A practice's only owner cannot delete their account until another owner is named.
- AI wrote this. A person should read the rules before client data goes in.
