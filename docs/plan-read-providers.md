# Plan reader: which AI key to add

Status: connected-unverified. The code follows each provider's published instructions and passes offline tests, but no real call has been made to OpenAI, Google or Anthropic from this work. Treat it as untested against the live services until you have run one real plan through it.

## Which secrets to add

In Cloudflare Pages, open the project, then Settings, then Variables and Secrets, and add one or more of these as secrets (names only here):

- `OPENAI_API_KEY`
- `GEMINI_API_KEY` (`GOOGLE_API_KEY` also works)
- `ANTHROPIC_API_KEY`

One is enough on its own. You do not need all three. A provider with no key is simply skipped.

## What order they are tried in

OpenAI first, then Gemini, then Anthropic. If one fails (an error, no credit, a timeout after about a minute, or an answer that does not have the right shape), the reader quietly moves to the next one that has a key. If every one fails, the page shows the usual "model error". If none has a key, it shows "not configured".

To change the order, add a plain variable `PLANREAD_PROVIDERS`, for example `gemini,openai,anthropic`. Only the providers you list are used.

## Optional settings

- `PLANREAD_OPENAI_MODEL`, `PLANREAD_GEMINI_MODEL`, `PLANREAD_MODEL` (Anthropic): choose a different model for that provider. Leave them out to use the built-in defaults.
- `PLANREAD_DAILY_CAP`: the most plan reads per day (300 if not set). A read counts once, even if it tries two providers.

## How to check it worked

1. After saving the secrets, redeploy the site so they take effect.
2. Open the status address in your browser: `/api/plan-read/` on the lab site.
3. Look for `"configured": true`. The `providers` list shows each provider in the order it is tried, and whether it has a key. It never shows the key itself.
4. Drop a real plan scan into Plan Studio. The result says which provider answered. That real read is the only proof the live connection works.

Plan images are passed to the provider and are not stored by assembl.

## The two guides use the same key

The studio guide and the assembl.co.nz home guide also answer on OpenAI first once `OPENAI_API_KEY` is set
(default model `gpt-6.2-astra`; override with `ARCHIPRO_OPENAI_MODEL` or `HOME_OPENAI_MODEL`). Claude stays as the
fallback if OpenAI can't answer. With no OpenAI key, nothing changes.

The guides move the page with tools, and GPT-6 Astra only takes tools on OpenAI's Responses API, so the guides call
that (the plan reader has no tools and stays on Chat Completions). Nothing is stored at OpenAI (`store: false`).

Checked live on 21 November 2026: the plan reader read a test sheet on `gpt-6.2-astra`. The guides' first live
attempt failed on the older Chat Completions call; the Responses version is tested offline only until it is deployed.
