# Executed proof — 9 November 2026

Environment: cloud workspace, Node v24.22.1. No dependency install or third-party executable run.

`node --test tools/nz-data-mcp/service.test.mjs evidence/tests/*.test.mjs`: **23 passed, 0 failed**, including subprocess stdio handshake/discovery. Tests use explicitly injected synthetic source payloads; existing evidence regression suite retains its labelled source fixtures.

Actual read-only service invocation (no fixture loading):

- `recent_earthquakes({})`: **available**. Checked `2026-11-09T09:29:03.959Z`, retrieved `2026-11-09T09:29:08.805Z`, expired `2026-11-09T09:34:08.805Z`. Raw response SHA-256 `f3d3c6ec628a218d644fcbcd5da8cdfbdbca8bca125b7d5280335ffa71cffaee`. First returned record `geonet:2026p841271`, origin `2026-11-08T06:29:33.794Z`, CC BY 3.0 NZ. This historical receipt is not a fresh response now.
- `search_nz_catalogue({query:"schools",limit:2})`: **unavailable**, empty records, null retrievedAt. Follow-up public diagnostic returned HTTP 200 with `text/html; charset=UTF-8` and an HTML page titled “Pardon Our Interruption”. The source's browser/security challenge is not JSON and is rejected. No challenge bypass attempted. Catalogue parsing/input/URL controls are unit-tested; successful live catalogue retrieval from this cloud environment remains **unverified/blocked by source response**.

`git diff --check`: passed. Prototype files, test-only CI and an exact-branch Vercel deployment-disable guard changed. Lab checkout is shallow; source files and GitHub merged metadata for PR121/122 were inspected, but ancestry of their merge SHAs cannot be proven from this shallow local object database.

No cloud service provisioned, no listener exposed, no auth changes, no hosted connector registration, no merge, no production deployment. Provider-specific clients and always-on hosting remain unverified. Initial local commit was not pushed. The subsequent draft-PR preparation adds an exact-branch automatic deployment disable guard before push.


Protocol follow-up: existing official `@modelcontextprotocol/client` 2.0.0 passed the `sdk-smoke.mjs` stdio exchange using explicitly synthetic injected source data. No installation. Scope: 2025-11-25 initialize/listTools/ping/tool result/tool validation error/unknown tool/close; not provider interoperability, modern MCP, cancellation or real catalogue access. The original 22 tests were also independently rerun by the parent; current suite is 23 after protocol fixes.
