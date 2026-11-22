# Found work: getting GETS alert emails in without pasting

Status: **built, not applied, not deployed.** A decision for Kate: nothing here has touched a database, Google or DNS.

## The route chosen: a Gmail reader (Google Apps Script)

The practice's own Gmail already receives the daily "GETS: Tender Subscription" email. A small script in that Gmail reads it and files the tenders in the workspace.

```
GETS email --> practice's Gmail --(hourly script)--> arch.hunt_inbox_ingest --> arch.hunt_inbox --> Found work
```

1. An owner opens Found work, "What to look for", then "Read GETS alerts from Gmail", and presses "Make a reader". The database makes a private token (`arch.hunt_inbox_new_token`) and keeps only its sha256.
2. The page shows the script with the token already in it, once, with five steps: open script.google.com and make a project; paste the script; press Run on `setup`; approve Google's permission screen; done.
3. Every hour the script searches `from:noreply@gets.govt.nz subject:"GETS" newer_than:3d -label:assembl/filed`, reads the plain text of each message, parses it with the same parser as the page, and posts only the tender fields (RFx ID, reference, buyer, name, closing time, link, current or advance notice) to `/rest/v1/rpc/hunt_inbox_ingest`, then labels the thread `assembl/filed`.
4. "Stop the reader" ends the token. Members and viewers see only whether a reader is on and when it last filed.

**The script is generated.** `node tools/build-gmail-reader.mjs` writes `tools/gmail-gets-reader/Code.gs` and `architecture/js/gmail-reader-script.js` from `architecture/js/gets-alert.js`, so the script and the page cannot read an email differently. A test fails when they are out of step.

**What it can and cannot do.** It reads GETS emails and adds a label. It never deletes, sends, replies to, forwards or moves mail. It sends no sender, recipient, subject or body anywhere, only public notice fields. The Supabase address and key in it are the page's public ones (config.js); the token is the only private part.

**Database side** (`20261122142000_arch_hunt_inbox_reader.sql`): `arch.hunt_inbox_route` holds token hashes; owners can see their rows but the hash column is not selectable by anyone. `arch.hunt_inbox_ingest(p_token, p_items)` is callable by anon because the token is the credential; it refuses a missing or revoked token, allows 48 calls a day (UTC) and 300 items a call, skips any item whose RFx ID is not digits or whose link is not `https://www.gets.govt.nz/<code>/ExternalTenderDetails.htm?id=<same id>`, and upserts by (practice, RFx ID). The random token and the hash use Postgres built-ins, so no extension is needed. An additional-information email reaches the database as an update to the same RFx ID (its closing time and name), never as a second row.

**Risks to know.** Anyone holding the token can add notices to that practice's inbox (not read anything); the worst they can do is fill it with 14,400 junk-but-well-formed notices a day, which an owner clears by stopping the reader. The script runs under the Gmail account of whoever pastes it, so use the account that receives the alerts. GETS can change its email wording; the parser is strict, so a change shows as "nothing filed", not as wrong data. Google shows its own warning on first run for a script it has not verified.

## Route dropped: a forwarding address with Cloudflare Email Routing

The first idea was a forwarding address (for example `alerts@hunt.<domain>`) with an Email Worker that parses and inserts with a per-practice token. It was dropped because **Cloudflare Email Routing takes over the MX records of the domain it is enabled on.** Enabling it on the main domain would send all of that domain's mail to Cloudflare and cut off Google Workspace mail. A subdomain would avoid that, but it means new DNS records, a Worker to deploy and keep, a verified forwarding rule for every practice, and practices having to set up forwarding in GETS or in Gmail. The Gmail reader needs no DNS, no routing, no deployment and no new mail address, and it stays inside the practice's own account. `workers/hunt-inbox/` was therefore not written.

## What is still open

- Apply the three migrations (`...141000`, `...142000`, and `...140000` for leads) to staging, then production, on Kate's word.
- Try the script once against a real GETS email in a test Gmail account before giving it to a practice. The parser has only been tested on invented emails in the shape GETS uses; a real email may differ in spacing or wording.
- A practice with several people who receive alerts needs one reader only; the first person to paste it files for everyone.
