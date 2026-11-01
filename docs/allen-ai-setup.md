# Switching on Allen's AI help (Vercel)

Allen, the study tutor on every study machine, and "Ask about this" on the other Lab pages call the Anthropic API from the **assembl-lab** Vercel project. Without a key they still work, but only from each machine's own notes; Allen says "AI help is off here".

The Lab runs on its own Vercel project, even though assembl.co.nz/lab shows it in a frame. **Only the assembl-lab project needs the key.** The assembl.co.nz site (its own project) does not.

## Brief for Cowork

> In Vercel, team **katecoveny-svgs-projects**, open the project **assembl-lab** (not colmap-wasm, not the assembl.co.nz project).
>
> 1. Go to **Settings → Environment Variables**.
> 2. Add **`ANTHROPIC_API_KEY`** with the assembl Anthropic API key (from the Anthropic Console → API keys; create a new key named "assembl-lab tutor" if there isn't one). Tick **Production** and **Preview**. Mark it **Sensitive**. Don't paste the key anywhere else.
> 3. Optional, only if Kate asks:
>    - `TUTOR_MODEL`: leave unset to use `claude-sonnet-5-5`, or set `claude-haiku-5-5` for a cheaper, simpler Allen.
>    - `TUTOR_PER_VISITOR` (default 40 messages per student per day) and `TUTOR_DAILY_CAP` (default 3000 for the whole site).
>    - `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`: makes those limits exact across servers. Without them the limits still apply, per server.
> 4. Environment variables only reach **new** deployments. Go to **Deployments**, open the latest **Production** deployment (from `main`) and choose **Redeploy**. Wait until it says Ready.
> 5. Check it: open **https://assembl-lab.vercel.app/api/tutor/** in a browser. It should show `"configured": true`. It never shows the key. If it says `false`, the variable isn't on Production, or the redeploy hasn't finished.
> 6. Test Allen: open https://assembl-lab.vercel.app/study/m/socials.html, tap **Ask Allen**, tap **Explain this step**. He should answer and move a control ("↻ Set …"). If he says "AI help is off here", go back to step 5.
> 7. If Allen answers "I couldn't think that one through just now", check **Logs** for lines starting `tutor: model error`: usually a wrong key, no credit on the Anthropic account, or a model name typo in `TUTOR_MODEL`.
>
> Report back: the check page result, and whether Allen answered on the social studies machine.

## Costs and limits

- Each student message is one or a few model calls: tool round trips (Allen moving a control) don't count against the student's limit.
- "Ask about this" on the non-study Lab pages uses the same key at `claude-haiku-5-5` with 2 questions per page per day.
- The Anthropic Console shows spend; set a monthly limit there if you want a hard ceiling.
