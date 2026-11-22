# Make it a photo: owner note

## What it does
On the twin pages (`/plan-studio/twins/drop/` after a plan is checked, and `/plan-studio/twins/16a/`), the architect frames a view of the 3D model and presses **Make it a photo**. The button sits on the 3D view; the options sit in a card under Stills.

1. The page renders a fresh frame and reads it straight away. This works on WebGPU and on the WebGL 2 fallback. The inspector highlight and the HTML labels are left out.
2. The frame is trimmed to the nearest shape Google Gemini makes (1:1, 2:3, 3:2, 3:4, 4:3, 4:5, 5:4, 9:16, 16:9 or 21:9). This usually trims under 1% of the frame. It is sent as a JPEG of 1600 px or less on the long side.
3. Beside it the page sends a **line drawing of exactly the same view**, trimmed the same way, drawn from the model's own geometry (`photoreal/geoview.ts`, loaded on demand: `photoreal/passes.ts` renders exact normals, depth and a part map; `photoreal/lines.ts` draws black lines where the building has an edge, grey for furniture, planting and ground). If the page cannot draw it, the view goes alone, as before.
4. `functions/api/render.js` asks Google Gemini for one image of that exact view as an architectural photograph, with the line drawing as the second image.
5. The page shows the photo against the captured view, with a before/after slider. Download saves the photo with the label burned into a band along its foot. The last four photos stay in memory for that tab only.

The fixed label sits on the image, under it, and in every download: **"Generated from the model view by Google Gemini. Not a photograph, and not a checked drawing."**

Every photo costs money, and the cost is shown before you press. The card, the button and "Try again" show Google's price. A paid request must carry `confirm: true` or it is refused (402) before it is counted. This is the pattern `api/plan-render.js` uses.

## Models and prices
Read from Google's own docs on 22 November 2026. ai.google.dev now redirects to aistudio.google.com/docs. Sources: `docs/image-generation.md`, `docs/pricing.md`, `api-reference/interactions-api/create-interaction.md`, `docs/interactions-overview.md`, `docs/api-errors.md`.

| Quality | Model id | Google's words | Size | Image output price | About per photo |
|---|---|---|---|---|---|
| Fast | `gemini-nano-banana-2.1` (Nano Banana 2.1) | "primary high-efficiency workhorse model for image generation and conversational editing" | 1K, least thinking (`minimal`) | US$30 per 1M tokens; a 1K image is 1120 tokens = **US$0.0336** | **US$0.04** (with input at US$1.50/1M and thinking at US$7.50/1M) |
| Best | `gemini-3-pro-image` (Nano Banana Pro) | "the premium choice for complex visual tasks" | 2K (priced the same as 1K) | US$120 per 1M tokens; a 1K or 2K image is 1120 tokens = **US$0.134** | **US$0.15** (input image US$0.0011, thinking at US$12/1M) |

Alternatives, if you set them by environment variable (prices from the same page):
- `gemini-3.1-flash-lite-image` (Nano Banana 2 Lite): "the fastest and cheapest Gemini image model". US$0.0336 per 1K image, input US$0.25/1M. It makes 1K only.
- `gemini-3.1-flash-image` (Nano Banana 2): the previous workhorse. US$0.067 per 1K image.

All images carry Google's SynthID watermark. With either model, 20 test photos cost at most about US$3 (all Best) or about US$0.80 (all Fast).

The request uses Google's Interactions API, `POST https://generativelanguage.googleapis.com/v1beta/interactions` with `Api-Revision: 2026-05-20`. Google's docs call this API the default and call `generateContent` "legacy". The request sends text then the image, and asks for `response_format: { type: "image", mime_type: "image/jpeg", aspect_ratio, image_size }` with `store: false`. By default, Google keeps every interaction for 55 days; with `store: false`, it keeps nothing for later retrieval. `RENDER_GEMINI_API=generate_content` switches to the legacy request (`v1/models/{id}:generateContent`, `responseModalities: ["IMAGE"]`, `imageConfig`). Use it if the Interactions call is ever refused.

The prompt revision is `RENDER_PROMPTS = "2026-11-23a"` (agent/photo-film-1123; it was `2026-11-22a`). It asks Google Gemini to:
- keep the camera and framing exactly
- with the line drawing: put every building edge of the photo on a black line of the drawing, and keep every black line an edge; never draw the lines
- keep every window and door opening, the stair's run, turns, landings and every step, every balustrade post and glass panel, the deck edges, the roof line and fascia, and every pole and pile where they are, at the same size and in the same number
- add, remove, move, resize, widen or straighten no building element, and change neither the stair's shape nor the balustrade's layout
- change only materials, light, sky and planting
- use natural New Zealand light (morning, midday, golden hour or overcast; summer or winter if chosen)
- plant New Zealand natives, only on ground the view shows, kept low
- add no people, text, watermark or logos
- return one image at the input's shape

An optional "setting" line (120 characters at most) is quoted. The prompt says it never changes the building.

## Switching it on
- `GEMINI_API_KEY` (or `GOOGLE_API_KEY`). It is already set in Cloudflare production for the plan reader. Branch previews have no key and answer "not switched on".
- Optional: `RENDER_GEMINI_FAST_MODEL`, `RENDER_GEMINI_BEST_MODEL`, `RENDER_GEMINI_API`, `RENDER_DAILY_CAP`, `RENDER_IP_PER_MINUTE`, `RENDER_IP_PER_DAY`, and a KV namespace bound as `RENDER_KV`.
- `GET /api/render` answers without a paid call. It gives configured yes/no, the model ids, sizes, limits, where counts are kept, the prompt revision and the estimates.

## Limits
- Only `https://lab.assembl.co.nz` and `*.assembl-lab.pages.dev` may POST. A POST with any other origin, or none, is refused.
- Request bodies over 5 MB are refused before they are read. Images over 4 MB decoded are refused. In practice the body limit caps an image at about 3.7 MB; the page sends 0.1 to 0.5 MB.
- The image must be a PNG, JPEG or WebP. Its own header must agree with its type. Each side must be 256 to 4096 px.
- Per IP: 6 a minute and 40 a day. For all callers: `RENDER_DAILY_CAP`, default 100 a day. A request counts once it is sent to Google, even if Google then fails, because it may still be billed. A refused request is never counted.
- Where counts are kept:
  - in KV, if `RENDER_KV` is bound: shared, eventually consistent
  - otherwise in Cloudflare's Cache API: per data centre, so the caps hold per data centre
  - always also in the running instance
  - A request is refused if any count is over. IPs are hashed with the day before use and never logged.
- Nothing is stored here but those counters. Images pass through and are dropped.
- Errors come back in plain English, with a code. The codes:
  - declined: Google's safety blocks
  - busy, no image, timeout, model error
  - daily cap, slow down
  - origin, not switched on, too large, unreadable, size
  - confirm spend

## What it is not
- Not the checked model. The photo can draw the building differently. Google Gemini may move a window, change a roof edge or add something, even though the prompt forbids it. Check it against the model view with the slider, and run the geometry check: on 22 Nov 2026 both test photos changed the stair (the check flags it in each).
- Not a photograph of a real building, and not a checked drawing. It gives no professional sign-off. It is an artist's impression made by Google Gemini, and it is labelled so on the page and in the file.
- Not private to the lab. The view goes to Google to make the photo. With `store: false` Google keeps nothing for later retrieval; Google's terms still apply.

## How it relates to `api/plan-render.js`
`api/plan-render.js` is the older Plan Studio page's (`/plan-studio/`) "AI enhance" for stills and hero clips. It goes through fal.ai with `FAL_KEY`. It is a Vercel-style Node handler (`req, res`, `process.env`) with no `functions/` twin. On Cloudflare Pages it is dead code: `GET https://lab.assembl.co.nz/api/plan-render` answers 404 (checked 22 Nov 2026), and the old page says "unavailable from here".

This feature borrows its good patterns: the price shown and confirmed before spending, a daily cap, and the label burned into the saved file. It does not depend on it. Offering fal's clips here later would mean porting it to `functions/` first.

## Checking it
- `node --test tests/render/*.test.mjs` runs 46 tests offline with Google mocked (three of them for the line drawing: its checks, the prompt, and that it goes to Google as the second image in both API shapes):
  - input checks and limits
  - prompt contents and model selection
  - both API shapes and error mapping
  - CORS and GET status, confirm-before-spend
  - counters in KV, the Cache API and the instance
  - the page helpers agree with the server, and the viewer carries the label
- Stills (mocked endpoint, served from disk): `/home/claude/tools/shot_render.py 1400 900` and `390 844`.
- Live test after merge, run by a person: `node /home/claude/render-test.mjs`. It sends one Fast photo by default and logs each call to `/home/claude/render-calls.log`. Add `--line VIEW-line.png` to send the line drawing (the view and drawing must be the same shape; `tools/film/geo-view.mjs` writes both).
- The geometry check (free, offline): `node tools/film/geocheck.mjs --photo PHOTO --line VIEW-line.png --mask VIEW-mask.png --reference VIEW-view.jpg`. It says whether the photo keeps the building's edges, part by part (stair, openings, roof, deck, balustrade, poles). See `docs/digital-twins/PHOTO-FILM.md`.
