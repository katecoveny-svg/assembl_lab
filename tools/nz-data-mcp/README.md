# NZ Data MCP — local review prototype

Extends the lab's existing `evidence/adapters/index.mjs` and `evidence/records.mjs`; creates a small stdio boundary, not another earthquake parser. No dependencies installed. Node 24.22.1 tested; Node 22+ recommended. No public listener, credentials, paid API, account, database, scheduler or deployment changes.

## Run from the repository root

```sh
node tools/nz-data-mcp/server.mjs
node --test tools/nz-data-mcp/service.test.mjs evidence/tests/*.test.mjs
```

The server waits for newline-delimited MCP JSON-RPC on stdin. A stdio-capable agent runner can launch:

```json
{"mcpServers":{"assembl-nz-data":{"command":"node","args":["/absolute/path/to/assembl_lab/tools/nz-data-mcp/server.mjs"]}}}
```

Use an absolute path on the machine running the agent. Running it in this cloud workspace does not make it reachable from ChatGPT, Claude, Gemini or Kate's offline Mac. Hosted provider clients need a separately reviewed authenticated transport and persistent host. Always-on hosting is **not established**. No provider-specific end-to-end client compatibility has been verified.

Minimal handshake, followed by discovery:

```json
{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","clientInfo":{"name":"review-client","version":"1"},"capabilities":{}}}
{"jsonrpc":"2.0","method":"notifications/initialized"}
{"jsonrpc":"2.0","id":2,"method":"tools/list"}
{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"recent_earthquakes","arguments":{}}}
{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"search_nz_catalogue","arguments":{"query":"schools","limit":2}}}
```

Only the 2025-11-25 protocol version is selected. A client requesting another version must accept that version or disconnect. This is a minimal hand-written review transport, not a claim of full MCP certification. It implements initialize/initialized, ping, tools/list and tools/call; no resources, prompts, subscriptions or server-initiated requests. Requests run serially with input backpressure.

## Source and safety contract

- `recent_earthquakes`: fixed versioned GeoNet MMI >=3 endpoint; strict existing evidence parser, at most 20 recent records; provider-deleted rows excluded. Event origin and retrieval timestamps remain separate. Retains GeoNet attribution, CC BY 3.0 NZ link and per-record scope/units. Not an alert service, complete catalogue, forecast or site hazard assessment.
- `search_nz_catalogue`: fixed CKAN package_search, public topics only, query 1–120 characters, limit 1–10. The query is sent to the public catalogue. Returns titles, publisher, catalogue links and publisher-reported licence metadata. Underlying resources are never fetched. Unknown/unsafe licence URLs remain null; no blanket commercial reuse permission is inferred. `observedAt` stays null: metadata modification is not a data observation timestamp. Catalogue discovery intentionally does not masquerade as the evidence contract's live or published benchmark categories.
- HTTPS fixed endpoints; redirects denied; no caller-controlled URL, header, key or environment-variable access. 12-second fetch-and-body deadline, 512 KiB body cap, 60 KiB data result cap; final MCP text/structured envelope capped at 128 KiB. 8 KiB input messages; oversized input closes the process. No raw upstream errors or query logs.
- One active source call per process; one attempt per tool per minute, including failures and changed search queries. No retries. Limits reset on restart and are **not distributed quotas**. No automatic fetching until a tool is called.
- No caches or offline fixtures in runtime. Failed calls return unavailable, empty records and null retrieval time, never the last successful data. A successful empty feed is distinct from an error. Consumers retaining results must recompute freshness using `expiresAt` (five minutes), reject future retrieval dates and mark older results stale. The provided freshness label is only a statement at response time; retrieval freshness does not mean an event or underlying dataset is recent.
- Publisher strings remain untrusted data, never instructions. Do not render them as raw HTML or follow result links automatically. Derived learning/business models must retain their own simulated classification and scope; this prototype does not silently alter any simulation inputs.

## Prior-art and selected source audit (9 November 2026)

Lab worktree based on main `48605a5`, containing merged PR121 (`d5e4d83`, evidence contract) and PR122 (`3dac08a6`, GeoNet source context). The existing `api/mcp.js` is a public cars demo with separate semantics; it is untouched.

Main Assembl inspected through GitHub at `b697123d6263715434902392a6d6275a5fe099f3`: `lib/nz-evidence/`, `plugins/mcp-servers/mcp-nz-evidence/src/server.ts`, `lib/public-nz/evidence-tool.ts` and the primitive registry. Existing SDK2 freight/Customs and architecture/RFI candidates are separate tools; public NZ evidence is Parliament-specific, not general catalogue search. Existing auth, hosting admission and billing controls are not repurposed. Shell fetch of that private repository lacked credentials; authenticated connector reads succeeded.

Read root Assembl AGENTS/START_HERE/context router/primitive registry and the lab's `.agents/skills/assembl-study-teardown/SKILL.md`. The latter applies to visual machine work; no machine or UI is changed here.

Candidate reviewed without installing or executing its code: [olitreadwell/nz-open-data-connectors](https://github.com/olitreadwell/nz-open-data-connectors/tree/3ff0b14ed986f4f3b92d5cc093cf35f26209fbe9), MIT, commit `3ff0b14ed986f4f3b92d5cc093cf35f26209fbe9`. Selected files: `packages/nz-mcp/src/{stdio,createSourceMcpServer,index}.ts`, `packages/nz-sources/src/{geonet,dataGovtNz,http}.ts`. Findings:

- `stdio.ts` uses the SDK stdio transport; it is not a remotely hosted MCP service.
- GeoNet performs a real feed read; CKAN searches catalogue metadata. Its default catalogue probe searches 'sheep', which is not arbitrary dataset ingestion.
- Separate fixture loaders exist; reviewed live paths throw rather than silently substituting fixtures.
- Shared HTTP helper follows up to 20 redirects and clears its deadline before callers consume the body; selected adapters call unbounded response.json. These boundaries are unsuitable for this narrow prototype without additional controls.
- Generic source tool accepts an API key; omitted here. No upstream implementation copied. This is a selected-file audit, not a security certification of the entire repository or dependency tree.

References: [GeoNet API](https://api.geonet.org.nz/), [GeoNet policy](https://www.geonet.org.nz/policy), [catalogue](https://catalogue.data.govt.nz/), [MCP stdio specification](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports).

## Proof and next gates

23 tests pass (12 new prototype tests plus 11 existing evidence tests), including a real subprocess handshake/discovery, bad inputs, body deadline, rate limit, no stale fallback, size limits and provenance. Unit source payloads are explicitly synthetic/injected, not live-feed evidence. See `PROOF.md` for actual source-request outcomes.

Before a remotely usable service: review a maintained SDK choice, provider client interoperability, authenticated hosting, lifecycle/cancellation under load, distributed request/egress quotas, logging retention and costs. No installation or deployment permission is presumed. Broader source adapters require source-by-source schema/licence/observation-date review. No PR, merge or production release is required to inspect or run this local prototype.


## Draft PR protocol review

The official `@modelcontextprotocol/client` 2.0.0 already installed in the adjacent Assembl workspace passed a real stdio client/server exchange (initialize, discovery, ping, synthetic success, tool input error, unknown-tool error and close). No dependency was installed. Repeat with `node tools/nz-data-mcp/sdk-smoke.mjs /absolute/path/to/@modelcontextprotocol/client`. That script deliberately uses an injected synthetic empty GeoNet response: it proves SDK wire compatibility for the selected 2025-11-25 subset, not source availability or ChatGPT/Claude/Gemini interoperability.

Reviewed against MCP 2025-11-25 lifecycle/tools/transport specifications. Known-tool field validation now returns `isError: true`, while malformed envelopes/unknown tools return JSON-RPC errors. Initialization requires object capabilities and client name/version. Unsupported pagination cursors are rejected. Cancellation is not implemented in this serial review transport; calls remain bounded by the 12-second source deadline. No claim of complete MCP conformance or modern protocol support.

`.github/workflows/nz-data-mcp.yml` runs the dependency-free regression suite on matching PRs with read-only contents permission and no credentials/deploy steps. The optional SDK smoke test is local-only because that SDK is not a lab dependency. `vercel.json` disables automatic Git deployment only for `codex/nz-data-mcp`, preserving other branches, per https://vercel.com/docs/project-configuration/git-configuration. This guard is included before the first push. No merge is authorized.
