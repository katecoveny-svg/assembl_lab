# Code pre-check: owner note

## What it is
A card on the plan page. For ten rules it shows what the model measures beside the figure in the official document, with a link to the clause.

It is a pre-check. It is not a compliance decision. It gives no professional sign-off. A person reviews every line.

Each line gives one of four answers: meets the cited figure, does not meet it, cannot tell from this model, or not applicable. Each says how the size was found: written, scaled, surveyed or assumed.

## The rules
All read from building.govt.nz and legislation.govt.nz on 22 November 2026.

| Rule | Clause | Edition | Figure |
|---|---|---|---|
| Natural light | G7/AS1 2.1.2.1(a) | 2nd edition, 29 Nov 2021 | Glazing 10% of floor area or more |
| Ventilation | G4/AS1 2.2.1.2 | 5th edition, 28 Jul 2025 | Openable area 5% of floor area or more |
| Stair pitch | D1/AS1 Table 6 | 2nd edition, Amendment 6, 1 Jan 2017 | 37° or less |
| Stair riser | D1/AS1 Table 6 | same | 190 mm or less |
| Stair tread | D1/AS1 Table 6 | same | 280 mm or more |
| Rise between landings | D1/AS1 Table 7 | same | 4.0 m or less |
| Landing length | D1/AS1 4.3.4 | same | 900 mm or more |
| Handrail | D1/AS1 6.0.1 | same | One side or more |
| Barrier needed | Building Code F4.3.1 | As at 15 Jan 2026 | Falls of 1 m or more |
| Barrier height | F4/AS1 Table 1 | 3rd edition, Amendment 2, 1 Jan 2017 | Decks 1000 mm, stairs 900 mm |

## What it cannot check, and why
- Riser, tread, handrail and barrier height. The model does not hold them. The card names what it needs.
- How much of a window opens. The model holds the whole unit.
- Glass area. It measures openings, frames included.
- Finished ground. Falls are measured to existing ground.
- Room use. Rooms are read by name.
- Close calls. A scaled size near a figure shows as "cannot tell". Those bands are the tool's own.

## Left out on purpose
- Smoke alarms. F7/AS1 no longer holds the figures. The model has no alarms.
- Door sizes. C/AS1 gives clear openings. The model holds wall openings.
- Window head height and glass type. The model cannot answer.
- Paid standards such as NZS 3604.

## Checking it
Run `node --test tests/code-checks/*.test.mjs`. Each rule is tested three ways: meets, does not meet, lacks the measurement.

## Status
Draft, on a branch. Not merged, not deployed. An architect should review the rules before anyone relies on them.

The older services page cites F7/AS1 for a smoke alarm within 3 m of a bedroom door. That figure is from a superseded edition. That page is unchanged.
