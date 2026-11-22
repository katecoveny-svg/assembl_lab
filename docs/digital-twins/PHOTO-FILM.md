# Photo and film from the model's geometry: owner note

Status (23 November 2026, branch `agent/photo-film-2-1123`, ported from `agent/photo-film-1123` without the held
"Photoreal" baked-light switch): **built and tested offline; connected-unverified until deployed.** The line drawing in
"Make it a photo" and `/api/film` reach Google only after this branch is merged and deployed. Every output is an artist's
impression made by Google Gemini from the model: not a photograph of a real building, not a checked drawing, and no
professional sign-off.

What is on this branch and what is held: the geometry passes, the line drawing, the geometry check, the photo endpoint's
line drawing and `/api/film` with its client are here. The geometry-pass **film maker** (`tools/film/film.mjs geo-film`, and
`geoFilm`/`geoStill` in `photoreal/index.ts`) needs the Photoreal module's camera path and capture code, which Kate is
holding back, so it is **not** on this branch: `/api/film` takes any 16:9 or 9:16 MP4 of the model, and the clips for it are
made on the held branch until that module (or a lean copy of its path and capture) lands. The files under
`plan-studio/twins/src/twin/photoreal/` keep the held branch's paths so the two merge cleanly later.

The aim: stills and a short fly-through that look like photographs of the house and keep the model's geometry exactly
(form, openings, stairs, decks, balustrades, roof; planting may be interpreted). Google Gemini makes the look; the model
makes the geometry; a deterministic check says whether the look kept the geometry.

## The pieces

| Piece | File | What it does |
|---|---|---|
| Geometry passes | `plan-studio/twins/src/twin/photoreal/passes.ts` | Renders the camera's view three times with plain replacement materials into a render target and reads it back byte for byte: view-space normals, linear depth (24 bits to 1 km) and a part map (walls, openings, roof, deck, deck balustrade, stair, poles, framing, inside, retaining, cladding ribs, furniture, ground, planting, sky; and glass). Glass is solid here; light decals, diagram lines and the sky are left out. Each mesh gets its own material back straight after. |
| Line drawing and pass pictures | `photoreal/lines.ts` (pure, shared by page, tools and tests) | Black where the building has an edge (silhouette on the nearer pixel, a fold over 32°, a change of part or glass), mid grey for the cladding ribs and furniture, light grey where planting and ground meet something else (none past 35 m). Also the depth picture, the normals picture and the lossless part mask. |
| Geometry-pass film (held, not on this branch) | `tools/film/film.mjs geo-film` (and `geoFilm` in `photoreal/index.ts`) on `agent/photo-film-1123` | The fly-through (`flythrough.json`, 16 s, 24 fps) at 1280 × 720 in the twin's normal look (2 jittered sub-frames a frame), with the four passes at each frame's own time; the bi-fold doors fold open as in the photoreal film; diagram lines hidden. Frame by frame, resumable. Encodes the films to watch (captioned "Rendered from the model. A visualisation, not a photograph."), the clips for Google Gemini (no caption: a caption in its input could be copied) and a contact sheet. Keeps the line and mask frames for the check. |
| One view and its passes | `tools/film/geo-view.mjs`, `photoreal/geoview.ts` | Opens the drop page on the sample plan from disk with `?geoview`, frames the view exactly as "Make it a photo" does, and writes `NAME-view.jpg`, `NAME-line.png` and `NAME-mask.png`. No API call. |
| "Make it a photo" with the drawing | `functions/api/render.js`, `photoUI.ts`, `photoFrame.ts` | The page draws the line drawing of exactly its framed view (`lineView` in `photoreal/geoview.ts`, loaded on demand; it needs only the twin, not the Photoreal look), trimmed like the colour frame, and sends it beside the view. The server checks it (readable, the view's shape within 1.5%, 1.5 MB at most) and sends it to Google as the second image. Photo prompt revision `2026-11-23a`; film prompt `2026-11-23b` (a slow, steady camera; planting moves slightly in wind; no added buildings, roofs or signs; any building, not only a house). Label unchanged. |
| Geometry check | `photoreal/geocheck.ts`, `tools/film/geocheck.mjs` | Compares a photo's edges with the model's line drawing, inside the building, part by part. Deterministic and free. See below. |
| "Make it a film" | `functions/api/film.js` | Sends one geometry-pass clip (and, optionally, a look reference still and the last frame of the part before) to Google Gemini's video editing. Same key, same `confirm: true`, caps, counters and label as `/api/render`. Background jobs come back with a signed polling handle. |
| Film client | `tools/film/gemini-film.mjs` | Cuts a long clip into parts, sends each through the deployed lab, polls, joins frame for frame, burns the label into every frame, runs the check on every frame. Counts paid calls in its log and stops at `--max-calls`. |

## What Google's docs say (read 23 November 2026)

`ai.google.dev/gemini-api/docs/*` redirects to `aistudio.google.com/docs/*`; the `.md` copies were read whole.

- <https://ai.google.dev/gemini-api/docs/video> → `aistudio.google.com/docs/video.md`: video generation and conversational
  video editing is **Gemini Omni Flash, `gemini-omni-1.2-flash`**. The Veo 3.1 Preview models in the Gemini API were shut
  down on 22 October 2026 (Veo 3.1 GA lives on the Gemini Enterprise Agent Platform).
- <https://aistudio.google.com/docs/omni.md> (the Omni page linked from it):
  - Interactions API, `POST https://generativelanguage.googleapis.com/v1beta/interactions`, `x-goog-api-key`.
  - Editing your own video: the video goes in the `input` with the instruction, as inline base64 (`type: "video",
    mime_type: "video/mp4", data`) or a Files API `uri`; Google recommends the Files API for big files.
  - Input videos for editing must be **15 seconds or less** (1.2). Extension: 3–10 s a turn, 30 s in all.
  - Output: `response_format: { type: "video", aspect_ratio: "16:9" | "9:16", resolution: "360p" | "720p" (default) |
    "1080p" | "4k", duration: "3s"…"15s" (default 10 s), delivery: "inline" | "uri" }`; 1080p and 4K are upscaled; native
    audio; `generation_config.video_config.task`: `text_to_video`, `image_to_video`, `reference_to_video`, `edit`, `extend`
    (Google: try prompting first, `task` as a fallback). Up to 6 reference images; reference images work when editing.
  - The video comes back in `steps[]` as a `model_output` with `type: "video"`; `delivery: "uri"` for videos over 4 MB.
  - Recommended for speed: `background: false, store: false, stream: false` (synchronous).
  - Editing uploaded videos is not offered in the EEA, Switzerland or the UK. Negative prompts are not supported (say it in
    the prompt). Simple editing prompts work best; "Keep everything else the same."
- <https://aistudio.google.com/docs/models/gemini-omni-flash.md>: output **24 FPS**, 3–15 s; `gemini-omni-1.1-flash` (input
  up to 10 s for editing, output 3–10 s) routes to 1.2 on **3 December 2026**. The 10 s figure Runway's resale lists is 1.1's.
- <https://aistudio.google.com/docs/pricing.md#gemini-omni-1.2-flash>: input US$1.50 per 1M tokens; video output
  **US$12 per 1M tokens**, 5,792 tokens a second of 720p, "approximately $0.07 per second (~$0.70 for a 10s clip)"; 360p
  1,931 tokens/s (US$0.023/s); 1080p 8,688 tokens/s (US$0.104/s); 4K 17,376 tokens/s (US$0.209/s). 1.1: US$17.50 per 1M,
  about US$0.10 a second. Paid tier only.
- <https://aistudio.google.com/docs/background-execution.md>: `background: true` returns an id to poll with
  `GET /v1beta/interactions/{id}` (statuses `in_progress`, `requires_action`, `completed`, `failed`, `cancelled`); it needs
  `store: true`; `DELETE /v1beta/interactions/{id}` removes it. The page lists standard Gemini models and agents; **it does
  not name Omni**.
- <https://aistudio.google.com/docs/interactions-overview.md>: stored interactions are kept 55 days (paid tier) unless
  deleted; `store: false` keeps nothing.
- <https://aistudio.google.com/api-reference/interactions-api/create-interaction.md>: the `VideoResponseFormat` and
  `VideoConfig.task` fields above.
- <https://aistudio.google.com/docs/file-input-methods.md>: inline data up to 100 MB a request.
- <https://aistudio.google.com/docs/image-generation.md>: both image models take up to 14 reference images (so the line
  drawing can go as a second image).

Not stated anywhere read: an input video's largest resolution or file size for editing (beyond the 100 MB request limit),
whether `background: true` works for Omni, and the exact length Google returns for a given input. A first WebFetch summary
of the Omni page named `gemini-omni-1.1-flash` and 10 s; the page itself, fetched the same day, says 1.2 and 15 s. The
code defaults to 1.2 with a **10 s part limit** (safe for both); `FILM_SEGMENT_MAX_S` raises it to at most 15.

## `/api/film`

- `GET /api/film`: status (configured, model, task, mode, part limit, sizes, limits, estimates, label); no paid call.
- `POST /api/film` with `{ video: "data:video/mp4;base64,…", still?, guide?, look?: { time, season }, resolution?: "360p" |
  "720p" | "1080p", mode?: "background" | "wait", part?, confirm: true }`:
  - refused before anything is counted: origin (only the lab and its previews), no key, body over 24 MB, a clip that is not
    an MP4 with a movie header, over 16 MB, longer than the part limit, shorter than 3 s, or not 16:9 or 9:16 (read from the
    file's own `mvhd` and `tkhd` boxes), unreadable or oversized stills, bad options; without `confirm: true`, 402 with the
    estimate;
  - caps: 2 a minute and 8 a day per IP, 20 a day in all (`FILM_IP_PER_MINUTE`, `FILM_IP_PER_DAY`, `FILM_DAILY_CAP`),
    counted when sent to Google;
  - the request: `{ model, input: [video, still?, guide?, text], response_format: { type: "video", aspect_ratio,
    resolution, duration: "Ns", delivery: "inline" }, generation_config: { video_config: { task: "edit" } } }` plus
    `background: true, store: true` (mode background) or `background: false, store: false` (mode wait);
  - background: 202 `{ status: "running", handle, poll }`. The handle is Google's id signed with HMAC-SHA256 (secret
    `FILM_HANDLE_SECRET`, else derived from the key; the key never leaves the server) and expires after a day.
    `GET /api/film?handle=…` polls Google (30 polls a minute per IP); it answers `running` until Google's interaction is
    `completed` **and** carries a video, then returns the video and deletes the interaction at Google. Completed with no
    video is `no_video`, never a film.
  - wait: the request stays open until Google answers (330 s timeout); 200 with the video only when Google's answer is
    completed with a video.
  - errors come back in plain words with a code (`refused` if Google rejects the request as sent, for example background
    mode for this model: then send `mode: "wait"`); every answer carries the label.
- Env: `FILM_GEMINI_MODEL` (default `gemini-omni-1.2-flash`), `FILM_GEMINI_MODE` (`background` | `wait`),
  `FILM_GEMINI_TASK` (default `edit`; empty leaves it to the model), `FILM_SEGMENT_MAX_S` (default 10, at most 15),
  `FILM_HANDLE_SECRET`, the caps above, `FILM_POLLS_PER_MINUTE`, and `FILM_KV` or `RENDER_KV` for shared counts.
- Long films: `planSegments(frames, fps, max)` cuts into parts of whole seconds within the limit, as even as they go
  (the 16 s fly-through → 8 s + 8 s); the client sends part 2 with the last frame of Gemini's part 1 as its guide, trims
  each part back to its own frame count and joins them.
- Price, 16 s at 720p in two parts: about US$1.12 (US$0.56 a part) plus a little for the input.

## The geometry check

`node tools/film/geocheck.mjs --photo PHOTO --line VIEW-line.png --mask VIEW-mask.png --reference VIEW-beauty.png` (a still),
or `--film FILM.mp4 --passes DIR/frames --reference DIR/gemini-input-normal-look.mp4` (every frame). Writes a JSON report
and an overlay picture: the photo dimmed, the model's scored edges green where the photo keeps them and red where it
does not, drifting regions boxed (orange: changed; blue: mostly planting in front).

Method: Canny edges on the log of brightness (an edge in shade counts like one in sun); the model's building edges from
the line drawing (cladding ribs drawn but not scored), each with its part and direction; with the model's own render as
reference, only the edges that render shows are scored. A small global shift and scale is allowed only when it fits
clearly better, and is reported. A model edge is kept when the photo has an edge of the same direction within tau (0.23%
of the diagonal: 3 px at 1040 × 780). Busy photos match by chance, so the same test runs with every edge moved
3·tau + 2 px in eight directions; the score is the share kept above that chance. Verdict: the building as a whole and every
key part (openings, roof, deck, deck balustrade, stair, poles) must keep 75%; 75–85% is reported as weak.

Calibration, sample house opening view (1040 × 780), reference = the twin's normal-look render (23 Nov 2026). On the first
48 frames of the 640 × 360 baked-light proof film (every sixth frame, against the geometry-pass frames) the score is 77–82%
overall, with the roof, deck, deck balustrade or poles at 56–75% in each frame: soft, low-resolution pictures of the right
geometry are flagged too.

| Picture | Overall | Stair | Openings | Roof | Deck | Deck balustrade | Poles | Verdict |
|---|---|---|---|---|---|---|---|---|
| The model's render from an earlier build (`view-input.jpg`) | 94% | 92% | 98% | 91% | 94% | 95% | 97% | holds |
| The model's baked-light render (photoreal look, same geometry) | 78% | 84% | 92% | 66% | −6% | 89% | 80% | drifts (roof, deck) |
| Google Gemini, Nano Banana 2.1, 22 Nov (`live-…-fast.jpg`) | 67% | **65%** | 85% | 43% | 68% | 81% | 67% | drifts |
| Google Gemini, Nano Banana Pro, 22 Nov (`live-…-best.jpg`) | 73% | **71%** | 80% | 66% | 92% | 72% | 70% | drifts |

Both Gemini photos are flagged on the stair, as Kate saw. Looking at the overlays: neither photo turned the stair round;
both kept its flights and landings roughly in place, but drew open treads and stringers of their own and moved the glass
panel joints and posts; the fast photo also drew a deeper fascia along the roof's low edge, where the model has a thin one.
The check is deliberately strict: the baked-light render (the same geometry in another look) is flagged on the roof line and
deck edge, where a dark fascia sits against dark bush and the deck's board ends draw a band of their own. It would rather
send a faithful picture to a person than pass a changed one; a person still looks at every picture.

## Run it

```bash
# one view: the view as the page sends it and its passes (the drop page's opening view)
node tools/film/geo-view.mjs --soft --out shots/view --name opening
# check a photo (free)
node tools/film/geocheck.mjs --photo PHOTO.jpg --line shots/view/opening-line.png --mask shots/view/opening-mask.png --reference shots/view/opening-view.jpg
# the geometry-pass film is made on the held branch (agent/photo-film-1123: tools/film/film.mjs geo-film)
# after the branch is deployed (paid: each part is a Google Gemini call)
node tools/film/gemini-film.mjs status
node tools/film/gemini-film.mjs make --clip films/photo-film/gemini-input-normal-look.mp4 --out films/photo-film/gemini \
  --still STILL.jpg --time golden --caption films/photo-film/caption-gemini-1280x720.png \
  --passes films/photo-film/frames --reference films/photo-film/gemini-input-normal-look.mp4 --max-calls 4
```

## What is assumed or not known

- The film endpoint has never called Google (phase 1 makes no live call). Whether Omni accepts background mode, how close
  its frames stay to the input's, and how it handles a part guided by a still are unknown until phase 2.
- The input clip is the twin's normal look. A line-drawing clip (`gemini-input-line.mp4`) is made too, untested with Google.
- Google's output length may differ from the part's; the joiner trims to the input's frame count and says if a part is short.
- A part travels as base64 JSON (the client caps it near 4 MB at 4 Mb/s; the function reads only the MP4's head to check it).
  If Cloudflare ever answers "exceeded CPU" (error 1102) on `/api/film`, the account's per-request CPU allowance is too
  small for that body: send smaller parts (`--crf 28`), or move the upload to Google's Files API (a stream the function
  passes through without reading). Not seen: no live call has been made.
- Mode wait holds the request open for minutes; Cloudflare documents no wall-clock limit for a Worker while the client
  stays connected, but this has not been tried with Google's video times. Background mode avoids it if Google accepts it.
- Every Google output carries SynthID. Background jobs are stored at Google until fetched (then deleted) or 55 days.
- The check scores edges, not meaning: planting drawn in front of the building reads as missing edges (the region says how
  much of it looks like planting); a material that draws strong lines of its own (board ends, deep shadow) can read as drift.
