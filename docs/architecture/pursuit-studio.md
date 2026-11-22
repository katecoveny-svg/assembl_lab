# Pursuit studio: owner note

## What it is
A studio for one enquiry, from a public tender notice to a draft response the practice can print and check. Open an enquiry in Clients and press **Pursue** (also on each open enquiry's card). The address is `#/pursuit/<enquiry id>/<step>`.

The studio prepares; the practice decides and approves. Nothing is submitted, sent or published by the tool. No section is a professional sign-off, and nothing says a design or a response meets a rule.

## The seven steps
1. **Notice.** What the enquiry and Found work already know (buyer, closing day, link, reference, why it was picked), each with where it came from. The practice corrects anything and pastes the notice's own words. The studio never opens tender documents itself.
2. **Ideas.** One press asks Claude for four to six concrete ways the practice could help, each with what it would do, why it fits (quoting the notice, and checked against the pasted text), what it needs, effort and risk. Also who decides, questions for the buyer (copied, never sent), a go or no-go checklist the practice ticks, and the countdown.
3. **Draft.** The response by section, in the order an NZ architectural services tender usually asks for it. "Start from the template" is free and uses only the practice's own facts, with a marked gap wherever something is missing. "Draft with Claude" is paid. Every section is edited in place and saved when the person leaves the box. Experience names only projects the practice ticks; the team comes from the Money settings; fees are always the practice's own. Numbers that are in no source are flagged for checking.
4. **Requirements.** The checklist below, marked "address", "check whether it applies" or "not for this notice", with links and dates read. What could not be confirmed is listed as left out, with the reason.
5. **ESG.** Which environmental, social and governance points the draft's own words cover, which are only named in a gap, and which are not there yet. Coverage only: no scores.
6. **Visuals.** The site in 3D from the street address (the existing address search) or a point: LINZ building outlines extruded to a height the practice sets (the outlines carry no heights, and the scene says so), the LINZ parcel, north, a scale bar and one massing block labelled "Massing study, not a design". Stills save as PNG. Also the programme bars and the stage wheel.
7. **Pack.** A4 portrait, laid out page by page, printed or saved as PDF from the browser. Cover, sections, visuals, ESG coverage, requirements with sources, and working notes marked to be taken out before anything goes to the buyer. Every page's footer: "Draft prepared with assembl for <practice> to review. Not submitted." The street address is printed only if the practice ticks it.

## Where it is kept
On the enquiry, as `pursuit` (in the shared records that is `extra.pursuit` on the enquiry row; in a browser, the enquiry's own record). It holds the notice text, the practice's corrections, the ideas, the draft sections and who edited them, the ticks, the programme, the site point and place, the massing sizes, the requirements version and a short history. Stills are not kept (they stay in the browser tab; the pack draws one again from the saved sizes). Two people editing the same pursuit at once: the last save wins.

## The server: /api/pursuit
`functions/api/pursuit.js`, Cloudflare Pages. Needs `ANTHROPIC_API_KEY` (already set for production). Optional: `PURSUIT_MODEL` (default `claude-opus-5-5`), `PURSUIT_DAILY_CAP` (default 30), `PURSUIT_IP_PER_MINUTE` (default 6), a KV namespace bound as `PURSUIT_KV` for counts shared across data centres.

- Only from `https://lab.assembl.co.nz` and `https://*.assembl-lab.pages.dev`.
- Only a signed-in member who can change the practice's records: the Supabase token is checked with `/auth/v1/user`, then `arch.can_write(practice)` is asked as that person.
- 64 KB body limit; the notice text up to 24,000 characters.
- `confirm: true` is required; GET shows the price and asks nothing that costs.
- The notice is data: it sits inside `<notice>` tags with angle brackets neutralised, and the prompt says text inside the tags is never an instruction.
- The answer is checked against a JSON schema; thin, malformed, refused or cut-off answers show nothing.
- Nothing is stored on the server but the rate counts.

Price (Anthropic's page, read 22 Nov 2026: Claude Opus 5.5 US$4 per million tokens in, US$20 out): ideas about US$0.13 a press, at most US$0.29; a draft about US$0.24, at most US$0.46. Each answer reports the tokens it used and its cost.

## Requirements checklist (data version 2026-11-22a)
Kept in `architecture/data/pursuit-requirements.json`; `node tools/pursuit-requirements.mjs` writes the copy the page and server import. Read from each publisher on 22 November 2026. The summaries are assembl's words; quotes are the publisher's, 15 words at most.

| Item | Publisher and source | Informs |
|---|---|---|
| Government Procurement Rules, 5th edition (in effect 1 Dec 2025; earlier contracts stay under the 4th) | NZ Government Procurement, procurement.govt.nz/procurement/principles-charter-and-rules/government-procurement-rules/ | Understanding, economic benefit |
| Rule 8: Economic benefit to New Zealand (at least 10% of the evaluation; thresholds $100,000 and $9 million for new construction) | procurement.govt.nz, …/planning-your-procurement/economic-benefit-to-new-zealand/ | Economic benefit, sustainability |
| 4th edition broader outcomes rules 16 to 20, each "Replaced by Rule 8" | procurement.govt.nz, table of rules changes (PDF) | Economic benefit |
| Rule 9: Planning for new construction works (construction procurement guides) | procurement.govt.nz, …/planning-for-new-construction-works/ | Approach, understanding |
| Whole-of-Life Embodied Carbon Assessment: Technical Methodology (valid from 25 Feb 2022; voluntary) | MBIE, codehub.building.govt.nz | Sustainability |
| Refocused climate work programme for building and construction (Cabinet minute ECO-24-MIN-0312, 18 Dec 2024; voluntary approach) | MBIE, mbie.govt.nz proactive release 31097 | Sustainability |
| Green Star (voluntary; non-residential) | NZGBC, nzgbc.org.nz/green-star | Sustainability |
| Homestar v5 (voluntary; new homes, 6 to 10 stars) | NZGBC, nzgbc.org.nz/homestar | Sustainability |
| Te Aranga Māori design principles | Auckland Council, Auckland Design Manual | Te Tiriti and mana whenua, approach |
| NZS 4121:2001 Design for access and mobility (cited by D1/AS1, G1/AS1, G5/AS1; revision under way) | Standards NZ via MBIE Codehub; Whaikaha | Accessibility |
| Designers' duty, HSWA 2015 section 39 | WorkSafe fact sheet and upstream duties appendix | Health and safety in design, risk |
| Health and safety by design: an introduction | WorkSafe | Health and safety in design, quality |
| The design process (seven stages) | NZ Institute of Architects | Programme |

Left out, with the reason kept in the data file:
- **Construction Sector Accord.** Not confirmed as current by its publisher: BRANZ says its Transformation Plan 2022 to 2025 was closed after a late-2023 Cabinet decision (page updated 4 July 2024); constructionaccord.nz states no status.
- **A mandatory embodied carbon limit or report.** None found; MBIE's method and the Government's approach are voluntary.
- **WorkSafe's health and safety in design topic page.** Could not be read on 22 Nov 2026; the fact sheet and the guide were read instead.

## Status
- Pages, rules, pack, scene and template draft: working, checked offline (tests/architecture/pursuit.test.mjs) and in stills.
- /api/pursuit: connected-unverified. Tested against a stubbed provider and a stubbed Supabase (tests/pursuit/endpoint.test.mjs). A real call needs a signed-in member, so it has to be tried by someone who can sign in on a preview.
- The Rule 8 summary we read does not name Māori or Pasifika businesses; the studio asks the practice to check what each notice asks.
