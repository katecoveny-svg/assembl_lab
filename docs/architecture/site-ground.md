# Real ground under a dropped plan

22 November 2026, branch `agent/ground-1122`. Not merged or deployed.

## What it does

Type the site's latitude and longitude in the **Real ground** card: the house is rebuilt on LINZ's 1 m LiDAR ground, with the legal boundary. Turn, move and floor level are tagged "from the plan", "assumed" or "set by hand".

## Where it runs

In the browser, straight from LINZ's open elevation files (Amazon S3, Sydney) and LINZ's parcel map. The lab's server never receives the point; LINZ sees which half-kilometre tiles are read. Code: `plan-studio/twins/src/twin/linz/`.

## Why not on the server

It ran as `/api/live/?feeds=ground` on Cloudflare. Measured on the preview (`?trace=1`):

- Cloudflare caches `.tiff` files and, on a cold file, drops the byte range. Over 512 MB it returned the whole file (1,243,832,160 bytes for 64 KB), past the 128 MB memory limit ("Memory limit would be exceeded before EOF").
- Under 512 MB the bytes came only as the whole file streamed in. Queenstown: no body by 8 s, so our timer stopped it ("The operation was aborted").
- A failure was cached: the repeat was a cache HIT in 0.07 s. The live feed now never caches a failed feed's answer.

The `ground` and `surface` server feeds are removed; nothing else used them.

## Reliability now

Chrome, 12 public points, each twice, fresh browser each time: 22 of 22 reads answered in 2.2 to 5.0 s; Fiordland said "unavailable". In the full page, software graphics held the read past 60 s, so the 3D view now rests meanwhile (3.5 to 4.8 s).

The card shows progress, says "slower than usual" after 8 s, offers Stop, and gives up at 60 s. A failure is never kept or drawn; if real ground was showing, the card says that earlier ground stays.

## Accuracy and labels

- Every cell within 0.005 m of GDAL; LINZ says about 0.2 m. Hamlin Hill read 59.03 m against a published 65 m: not explained.
- From LINZ: survey, flight dates, NZVD2016, credit. Overlapping surveys: the one matching the national model is named, or the card says it could not tell.
- Assumed until set: point = middle of the house; north from the plan, else up the sheet; floor 0.45 m above the highest ground under it.
- Ground colour is drawn from the heights (green gentle, olive-brown steep, a line each metre). Not a photograph.

## Not done

- No aerial photo; trees and buildings not told apart.
- On steep ground the second home's pad cuts sheer walls into the slope.
- Untried on a real graphics card, a phone, or Safari.
