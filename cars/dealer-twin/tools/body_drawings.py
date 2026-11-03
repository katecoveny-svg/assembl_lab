#!/usr/bin/env python3
"""Body-style drawings for the dealer twin's stock (stopgap until each listing has a real photo or a proper Blender render).

    python3 cars/dealer-twin/tools/body_drawings.py        # writes cars/dealer-twin/img/body/<body>.svg and <body>-sq.svg

Six generic side elevations: hatch, sedan, wagon, suv, ute, van. They are drawn in millimetres from typical New Zealand
used-stock dimensions (length, height, wheelbase, overhangs, tyre size, ground clearance), all at ONE shared scale, so a
ute reads longer and taller than a small hatch. They are drawings of a body style, not of any listed car and not of any
manufacturer's design: no badges, no grille pattern, no signature lamp graphics.

Palette (assembl): chalk #F5F1F2 ground, paper #FFFDFB body, ink #492B3E line, plum #240B21 tyres, small pastel accents
(lilac glass tint, blush tail lamps) only. Strokes use vector-effect="non-scaling-stroke", so line weight stays at
1-1.6 CSS px at any display size.
"""
import math, pathlib

OUT = pathlib.Path(__file__).resolve().parent.parent / "img" / "body"
INK, PLUM, PAPER, CHALK, ROSE = "#492B3E", "#240B21", "#FFFDFB", "#F5F1F2", "#916A70"
GLASS, BLUSH, SHADOW, LILAC = "#E6E1EC", "#EFCFD4", "#E6DCE1", "#CDBFDD"

# Frame: one scale for every body. 4:3 card = 6000 x 4500 mm, square = 6000 x 6000 mm.
FRAME_W = 6000

# Typical dimensions (mm). wheel = tyre outside diameter, rim = rim diameter. fo = front overhang. clr = rocker height.
SPEC = {
    "hatch": dict(label="Small hatchback", L=4050, H=1450, wb=2550, fo=800, wheel=600, rim=381, clr=175),
    "sedan": dict(label="Sedan", L=4700, H=1440, wb=2750, fo=930, wheel=650, rim=432, clr=165),
    "wagon": dict(label="Station wagon", L=4680, H=1490, wb=2700, fo=920, wheel=640, rim=406, clr=170),
    "suv":   dict(label="Mid-size SUV", L=4600, H=1690, wb=2690, fo=920, wheel=730, rim=457, clr=230),
    "ute":   dict(label="Double-cab ute", L=5320, H=1815, wb=3220, fo=900, wheel=780, rim=432, clr=265),
    "van":   dict(label="Long-wheelbase van", L=5265, H=1990, wb=3110, fo=760, wheel=690, rim=381, clr=230),
}

# Silhouettes, front at x=0 facing left. Each vertex: (x mm from front, z mm above ground, corner radius mm).
# Runs from the front bumper's lower edge, over the roof, to the rear bumper's lower edge; the sills and wheel arches close it.
SIL = {
    "hatch": [(70, 250, 0), (0, 430, 90), (25, 700, 120), (1080, 950, 90), (1990, 1430, 300), (3150, 1450, 260),
              (3840, 1330, 120), (4030, 920, 70), (4040, 470, 80), (3975, 250, 0)],
    "sedan": [(80, 245, 0), (0, 440, 90), (30, 690, 140), (1420, 900, 90), (2350, 1420, 320), (3300, 1440, 300),
              (3920, 1080, 160), (4640, 1000, 90), (4700, 720, 80), (4680, 440, 80), (4610, 240, 0)],
    "wagon": [(80, 250, 0), (0, 440, 90), (30, 700, 140), (1380, 920, 90), (2280, 1460, 320), (4320, 1490, 220),
              (4630, 1350, 120), (4680, 760, 70), (4670, 450, 80), (4600, 250, 0)],
    "suv":   [(90, 330, 0), (0, 520, 90), (30, 900, 150), (1150, 1110, 90), (1950, 1650, 300), (3950, 1690, 260),
              (4480, 1560, 140), (4590, 1050, 80), (4580, 520, 90), (4500, 330, 0)],
    "ute":   [(100, 380, 0), (0, 600, 100), (40, 1050, 150), (1350, 1260, 90), (2050, 1790, 220), (3150, 1815, 120),
              (3240, 1730, 40), (3270, 1220, 30), (5300, 1220, 40), (5320, 560, 60), (5250, 380, 0)],
    "van":   [(90, 330, 0), (0, 520, 90), (40, 920, 160), (520, 1080, 120), (1150, 1900, 200), (5150, 1990, 160),
              (5262, 1880, 60), (5265, 520, 80), (5180, 330, 0)],
}

# Daylight openings (side glass), each a list of (x, z, r); pillars are drawn as paper bands over them.
DLO = {
    "hatch": [[(1230, 995, 40), (2020, 1372, 220), (3130, 1392, 200), (3760, 1272, 100), (3735, 1065, 40), (1230, 995, 40)]],
    "sedan": [[(1570, 950, 40), (2390, 1370, 240), (3260, 1385, 240), (3800, 1110, 90), (3640, 1040, 40), (1570, 950, 40)]],
    "wagon": [[(1530, 965, 40), (2320, 1405, 240), (4270, 1425, 180), (4500, 1330, 90), (4490, 1060, 40), (1530, 965, 40)]],
    "suv":   [[(1300, 1160, 40), (1990, 1595, 220), (3920, 1625, 200), (4390, 1525, 100), (4370, 1220, 40), (1300, 1160, 40)]],
    "ute":   [[(1490, 1310, 40), (2090, 1735, 180), (3120, 1750, 80), (3140, 1330, 40), (1490, 1310, 40)]],
    "van":   [[(640, 1120, 40), (1180, 1830, 160), (1880, 1845, 60), (1880, 1180, 40), (640, 1120, 40)]],
}
# Pillars across the glass: (x centre at beltline, x centre at roof, width mm)
PILLARS = {
    "hatch": [(2330, 2290, 95), (3220, 3290, 120)],
    "sedan": [(2620, 2580, 95), (3460, 3420, 80)],
    "wagon": [(2560, 2520, 95), (3500, 3480, 120)],
    "suv":   [(2420, 2380, 100), (3420, 3440, 130)],
    "ute":   [(2450, 2420, 100)],
    "van":   [],
}
# Door shut lines: polylines (x, z) from belt to sill. Last door may sweep round the rear arch.
DOORS = {
    "hatch": [[(1170, 990), (1150, 560), (1190, 260)], [(2340, 1040), (2330, 260)], [(3260, 1070), (3270, 700), (3120, 520), (3000, 300), (3000, 260)]],
    "sedan": [[(1510, 935), (1490, 560), (1530, 255)], [(2630, 1000), (2620, 255)], [(3540, 1030), (3560, 720), (3420, 520), (3330, 300), (3330, 255)]],
    "wagon": [[(1470, 955), (1450, 560), (1490, 260)], [(2570, 1010), (2560, 260)], [(3510, 1040), (3530, 720), (3400, 520), (3300, 300), (3300, 260)]],
    "suv":   [[(1240, 1150), (1220, 700), (1260, 335)], [(2430, 1190), (2420, 335)], [(3430, 1210), (3450, 860), (3290, 640), (3190, 380), (3190, 335)]],
    "ute":   [[(1430, 1300), (1410, 800), (1450, 385)], [(2460, 1320), (2450, 385)], [(3150, 1330), (3150, 385)]],
    "van":   [[(580, 1100), (560, 700), (600, 335)], [(1900, 1170), (1900, 335)], [(3150, 1880), (3150, 335)]],
}
# Rear opening (tailgate / boot lid / hatch) shut line
TAIL = {
    "hatch": [(3690, 1345), (3840, 980), (3880, 560)],
    "sedan": [(3900, 1060), (4560, 990)],
    "wagon": [(4470, 1460), (4560, 1000), (4570, 560)],
    "suv":   [(4380, 1640), (4470, 1150), (4470, 600)],
    "ute":   [(5240, 1215), (5240, 560)],
    "van":   [(5160, 1950), (5160, 380)],
}
# Front lamp (polygon), rear lamp (polygon)
LAMPS = {
    "hatch": ([(40, 735), (360, 805), (380, 745), (60, 650)], [(3960, 1150), (4030, 1150), (4038, 900), (3990, 900)]),
    "sedan": ([(45, 720), (430, 790), (450, 730), (70, 640)], [(4500, 1010), (4680, 990), (4692, 830), (4560, 860)]),
    "wagon": ([(45, 730), (430, 800), (450, 740), (70, 650)], [(4570, 1250), (4665, 1240), (4675, 900), (4600, 900)]),
    "suv":   ([(45, 930), (430, 1010), (450, 950), (70, 850)], [(4480, 1420), (4585, 1400), (4590, 1100), (4500, 1110)]),
    "ute":   ([(45, 1080), (420, 1160), (440, 1090), (70, 990)], [(5262, 1180), (5315, 1180), (5318, 880), (5262, 880)]),
    "van":   ([(50, 950), (380, 1030), (400, 970), (75, 870)], [(5205, 1250), (5262, 1250), (5264, 900), (5205, 900)]),
}
HANDLES = {"hatch": [2080, 3020], "sedan": [2380, 3300], "wagon": [2310, 3270], "suv": [2170, 3200], "ute": [2200, 2980], "van": [1650, 3400]}
MIRROR = {"hatch": (1180, 1010), "sedan": (1520, 950), "wagon": (1480, 970), "suv": (1250, 1170), "ute": (1440, 1320), "van": (600, 1130)}


def rounded(points, closed=False):
    """Path through vertices with quadratic corner rounding of radius r at each vertex."""
    n, d = len(points), []
    for i, (x, z, r) in enumerate(points):
        if (not closed and (i == 0 or i == n - 1)) or r <= 0:
            d.append(("L" if d else "M") + f"{x:.1f},{z:.1f}")
            continue
        px, pz, _ = points[i - 1]
        nx, nz, _ = points[(i + 1) % n]
        a, b = math.hypot(x - px, z - pz), math.hypot(nx - x, nz - z)
        ra, rb = min(r, a / 2), min(r, b / 2)
        sx, sz = x + (px - x) / a * ra, z + (pz - z) / a * ra
        ex, ez = x + (nx - x) / b * rb, z + (nz - z) / b * rb
        d.append(("L" if d else "M") + f"{sx:.1f},{sz:.1f}")
        d.append(f"Q{x:.1f},{z:.1f} {ex:.1f},{ez:.1f}")
    if closed: d.append("Z")
    return "".join(d)


def build(body, square=False):
    s = SPEC[body]
    fh = FRAME_W if square else FRAME_W * 3 // 4
    ground = fh * (0.66 if square else 0.79)
    ox = (FRAME_W - s["L"]) / 2
    X = lambda x: ox + x
    Z = lambda z: ground - z
    P = lambda pts: [(X(x), Z(z), r) for x, z, r in pts]
    wr, rr = s["wheel"] / 2, s["rim"] / 2
    wf, wrr = s["fo"], s["fo"] + s["wb"]
    arch = wr + 45

    # body outline: silhouette, then sill with two arches, back to the start
    sil = SIL[body]
    top = rounded(P(sil))
    clr = s["clr"]
    def arch_pts(cx):
        dx = math.sqrt(max(arch ** 2 - (clr - wr) ** 2, 0))
        return X(cx + dx), X(cx - dx)
    rr_a, rr_b = arch_pts(wrr)
    fr_a, fr_b = arch_pts(wf)
    lo = Z(clr)
    outline = (top + f"L{rr_a:.1f},{lo:.1f}A{arch:.1f},{arch:.1f} 0 1 0 {rr_b:.1f},{lo:.1f}L{fr_a:.1f},{lo:.1f}"
               f"A{arch:.1f},{arch:.1f} 0 1 0 {fr_b:.1f},{lo:.1f}Z")

    g = []
    W = 'vector-effect="non-scaling-stroke"'
    # ground shadow + ground line
    g.append(f'<ellipse cx="{X(s["L"] / 2):.0f}" cy="{ground:.0f}" rx="{s["L"] * .56:.0f}" ry="{max(70, s["L"] * .022):.0f}" fill="{SHADOW}"/>')
    g.append(f'<line x1="{X(-260):.0f}" y1="{ground:.0f}" x2="{X(s["L"] + 260):.0f}" y2="{ground:.0f}" stroke="{ROSE}" stroke-width="1" {W}/>')
    # body
    g.append(f'<path d="{outline}" fill="{PAPER}" stroke="{INK}" stroke-width="1.6" stroke-linejoin="round" {W}/>')
    # glass
    for dlo in DLO[body]:
        g.append(f'<path d="{rounded(P(dlo[:-1]), closed=True)}" fill="{GLASS}" stroke="{INK}" stroke-width="1.1" stroke-linejoin="round" {W}/>')
    # pillars: paper bands clipped to the glass
    for i, (xb, xt, w) in enumerate(PILLARS[body]):
        g.append(f'<path d="M{X(xb - w / 2):.1f},{Z(0):.1f}L{X(xt - w / 2):.1f},{Z(3000):.1f}L{X(xt + w / 2):.1f},{Z(3000):.1f}L{X(xb + w / 2):.1f},{Z(0):.1f}Z" '
                 f'fill="{PAPER}" stroke="{INK}" stroke-width="1.1" clip-path="url(#dlo-{body})" {W}/>')
    # windscreen edge seen side-on: a second line just inside the A-pillar
    # waist (character) line, faint
    belt = DLO[body][0][0][1]
    g.append(f'<path d="M{X(160):.1f},{Z(belt - 240):.1f}C{X(s["L"] * .35):.1f},{Z(belt - 200):.1f} {X(s["L"] * .7):.1f},{Z(belt - 160):.1f} {X(s["L"] - 120):.1f},{Z(belt - 150):.1f}" '
             f'fill="none" stroke="{LILAC}" stroke-width="1" {W}/>')
    # shut lines
    for door in DOORS[body]:
        g.append('<polyline points="' + " ".join(f"{X(x):.1f},{Z(z):.1f}" for x, z in door) + f'" fill="none" stroke="{INK}" stroke-width="1" stroke-linejoin="round" {W}/>')
    g.append('<polyline points="' + " ".join(f"{X(x):.1f},{Z(z):.1f}" for x, z in TAIL[body]) + f'" fill="none" stroke="{INK}" stroke-width="1" {W}/>')
    if body == "van":  # sliding-door track
        g.append(f'<line x1="{X(1950):.0f}" y1="{Z(1080):.0f}" x2="{X(4800):.0f}" y2="{Z(1080):.0f}" stroke="{INK}" stroke-width="1" {W}/>')
    if body == "ute":  # tray: tub top rail and tie-down rail
        g.append(f'<line x1="{X(3290):.0f}" y1="{Z(1170):.0f}" x2="{X(5300):.0f}" y2="{Z(1170):.0f}" stroke="{INK}" stroke-width="1" {W}/>')
    if body == "suv":  # roof rails on two feet
        g.append(f'<path d="M{X(2120):.0f},{Z(1690):.0f}L{X(2200):.0f},{Z(1745):.0f}L{X(3880):.0f},{Z(1755):.0f}L{X(3960):.0f},{Z(1692):.0f}" fill="{PAPER}" stroke="{INK}" stroke-width="1.1" stroke-linejoin="round" {W}/>')
    if body in ("suv", "ute"):  # wheel-arch flares
        for cx in (wf, wrr):
            a2 = arch + 70
            dx2 = math.sqrt(max(a2 ** 2 - (clr + 40 - wr) ** 2, 0))
            g.append(f'<path d="M{X(cx + dx2):.1f},{Z(clr + 40):.1f}A{a2:.1f},{a2:.1f} 0 1 0 {X(cx - dx2):.1f},{Z(clr + 40):.1f}" fill="none" stroke="{INK}" stroke-width=".9" {W}/>')
    # handles, mirror, lamps, fuel flap
    for hx in HANDLES[body]:
        hz = belt - 150 if body != "van" else 1000
        g.append(f'<rect x="{X(hx):.0f}" y="{Z(hz):.0f}" width="190" height="40" rx="20" fill="{PAPER}" stroke="{INK}" stroke-width="1" {W}/>')
    mx, mz = MIRROR[body]
    g.append(f'<path d="M{X(mx):.0f},{Z(mz):.0f}L{X(mx + 40):.0f},{Z(mz + 130):.0f}Q{X(mx + 60):.0f},{Z(mz + 175):.0f} {X(mx + 190):.0f},{Z(mz + 160):.0f}L{X(mx + 230):.0f},{Z(mz + 40):.0f}Z" '
             f'fill="{PAPER}" stroke="{INK}" stroke-width="1.1" stroke-linejoin="round" {W}/>')
    fl, rl = LAMPS[body]
    g.append('<polygon points="' + " ".join(f"{X(x):.0f},{Z(z):.0f}" for x, z in fl) + f'" fill="{PAPER}" stroke="{INK}" stroke-width="1" stroke-linejoin="round" {W}/>')
    g.append('<polygon points="' + " ".join(f"{X(x):.0f},{Z(z):.0f}" for x, z in rl) + f'" fill="{BLUSH}" stroke="{INK}" stroke-width="1" stroke-linejoin="round" {W}/>')
    # lower bumper / sill cladding line
    g.append(f'<line x1="{X(wf + arch + 60):.0f}" y1="{Z(clr + 70):.0f}" x2="{X(wrr - arch - 60):.0f}" y2="{Z(clr + 70):.0f}" stroke="{INK}" stroke-width=".8" {W}/>')
    # wheels: tyre, rim, five spokes, hub
    for cx in (wf, wrr):
        x0, z0 = X(cx), Z(wr)
        g.append(f'<circle cx="{x0:.1f}" cy="{z0:.1f}" r="{wr:.0f}" fill="{PLUM}"/>')
        g.append(f'<circle cx="{x0:.1f}" cy="{z0:.1f}" r="{rr:.0f}" fill="{CHALK}" stroke="{INK}" stroke-width="1" {W}/>')
        g.append(f'<circle cx="{x0:.1f}" cy="{z0:.1f}" r="{rr * .86:.0f}" fill="none" stroke="{INK}" stroke-width=".7" {W}/>')
        for k in range(5):
            a = math.radians(-90 + k * 72)
            g.append(f'<line x1="{x0 + math.cos(a) * rr * .2:.1f}" y1="{z0 + math.sin(a) * rr * .2:.1f}" x2="{x0 + math.cos(a) * rr * .84:.1f}" y2="{z0 + math.sin(a) * rr * .84:.1f}" '
                     f'stroke="{INK}" stroke-width="1.2" stroke-linecap="round" {W}/>')
        g.append(f'<circle cx="{x0:.1f}" cy="{z0:.1f}" r="{rr * .2:.0f}" fill="{PAPER}" stroke="{INK}" stroke-width="1" {W}/>')
    # overall-length dimension line (lilac), so scale is legible
    dz = ground + 230
    g.append(f'<g stroke="{LILAC}" stroke-width="1" {W}><line x1="{X(0):.0f}" y1="{dz:.0f}" x2="{X(s["L"]):.0f}" y2="{dz:.0f}" {W}/>'
             f'<line x1="{X(0):.0f}" y1="{dz - 70:.0f}" x2="{X(0):.0f}" y2="{dz + 70:.0f}" {W}/><line x1="{X(s["L"]):.0f}" y1="{dz - 70:.0f}" x2="{X(s["L"]):.0f}" y2="{dz + 70:.0f}" {W}/></g>')

    clip = "".join(f'<path d="{rounded(P(d[:-1]), closed=True)}"/>' for d in DLO[body])
    px = (1200, 1200) if square else (1200, 900)
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {FRAME_W} {fh}" width="{px[0]}" height="{px[1]}" role="img" '
            f'aria-label="Drawing of a generic {s["label"].lower()} body style, side view. Not a picture of any listed car.">'
            f'<title>Generic {s["label"].lower()}, side view (body-style drawing)</title>'
            f'<defs><clipPath id="dlo-{body}">{clip}</clipPath></defs>'
            f'<rect width="{FRAME_W}" height="{fh}" fill="{CHALK}"/>' + "".join(g) + "</svg>\n")


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for body in SPEC:
        (OUT / f"{body}.svg").write_text(build(body))
        (OUT / f"{body}-sq.svg").write_text(build(body, square=True))
    print("wrote", sorted(p.name for p in OUT.glob("*.svg")))


if __name__ == "__main__":
    main()
