# Assembl Creative — source export

Exported on 27 October 2026 from the Assembl Creative Site to the `pursuit` branch of `katecoveny-svg/assembl_lab`.

- Source Site: https://assembl-creative.katecoveny.chatgpt.site
- Source revision: `8dfd63d64e15981af05ad036cbd0a5dff4dcabb0`
- Location: `pursuit/`

This folder contains the complete tracked source of the standalone Creative Studio, including its image-led workspace, site and deck editor, film canvas, original artwork, New Zealand narration, product film, API routes, database migrations, dependency lockfile and verification scripts. It is the Creative project linked in the request, not a copy of the separate Pursuit portal.

The original 132 tracked files are preserved byte-for-byte. This note is the only added file. Existing lab files are preserved on the branch.

## Runtime requirements

The application uses React/Vinext with a Cloudflare Worker, a D1 database binding named `DB`, and Sites-managed ChatGPT authentication. The original README documents its environment. Copying the source does not provision a database, transfer saved designs or client records, configure generation providers, or deploy a separate application.

The original `.openai/hosting.json` remains as part of the source snapshot and references the existing Creative Site. Register a separate deployment target before deploying a fork; do not reuse that project identifier unintentionally. Hosting outside Sites requires an appropriate authentication integration rather than trusting user-supplied identity headers.

Runtime secrets and database contents are not included. Generated and uploaded client assets stored in D1 are not exported; the committed original artwork and narrated film are included.
