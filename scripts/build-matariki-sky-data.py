#!/usr/bin/env python3
"""Builds matariki-sky/data/stars.json from two public catalogues (run with: python3 -I this.py <inputs>).

Inputs (download them yourself; they are not kept in the repo):
  gaia_pleiades.csv      Gaia DR3 gaia_source, a simple kinematic selection around the cluster (query below)
  gaia_bright_extra.csv  Gaia DR3 rows for three bright members the selection misses (Alcyone has no
                         parallax in DR3; Merope's and Taygeta's DR3 astrometry falls outside the cuts)
  hyg_v44.csv.gz         HYG database v4.4, https://codeberg.org/astronexus/hyg (CC BY-SA 4.0)

Gaia query (ESA Gaia archive TAP, https://gea.esac.esa.int/tap-server/tap):
  SELECT source_id, ra, dec, parallax, parallax_error, pmra, pmdec, phot_g_mean_mag, bp_rp, ruwe, teff_gspphot
  FROM gaiadr3.gaia_source
  WHERE 1=CONTAINS(POINT(ra,dec), CIRCLE(56.75,24.1167,4.0))
    AND parallax BETWEEN 6.4 AND 8.4
    AND SQRT(POWER(pmra-19.997,2)+POWER(pmdec+45.548,2)) < 4.0
    AND phot_g_mean_mag < 15
  and the extra rows: WHERE source_id IN (66714384142368256, 65205373152172032, 65296907494549120)

This is a simple selection, not a published membership list: a few field stars may be in it and some
members are missed. The cluster's mean proper motion is from Gaia Collaboration, Babusiaux et al. 2018.

Distances: a member is drawn at 1000/parallax when its Gaia DR3 parallax is better than 2% and RUWE < 1.4.
Otherwise (the bright stars, whose Gaia astrometry is less certain) it is drawn at the cluster distance,
136.2 pc (Melis et al. 2014, Science 345, 1029), along its own line of sight, and the page says so.
We do not use the Hipparcos distances for the bright members: they are the low values of the old
"Pleiades distance controversy" that the VLBI result settled.

usage: build-matariki-sky-data.py gaia_pleiades.csv gaia_bright_extra.csv hyg_v44.csv.gz out.json
"""
import csv, gzip, json, math, sys

CLUSTER_PC = 136.2
MAG_LIMIT_SKY = 6.5      # naked-eye background from HYG
MATCH_ARCSEC = 6.0

GREEK = dict(Alp='α', Bet='β', Gam='γ', Del='δ', Eps='ε', Zet='ζ', Eta='η', The='θ', Iot='ι', Kap='κ', Lam='λ',
             Mu='μ', Nu='ν', Xi='ξ', Omi='ο', Pi='π', Rho='ρ', Sig='σ', Tau='τ', Ups='υ', Phi='φ', Chi='χ',
             Psi='ψ', Ome='ω')
SUP = str.maketrans('0123456789', '⁰¹²³⁴⁵⁶⁷⁸⁹')

def designation(h):
    """Bayer and Flamsteed designations from HYG's bayer/flam/con columns, e.g. 'η Tau · 25 Tau'."""
    con, out = h.get('con') or '', []
    if h.get('bayer'):
        letter, _, n = h['bayer'].partition('-')
        out.append(GREEK.get(letter, letter) + n.translate(SUP) + ' ' + con)
    if h.get('flam'):
        out.append(h['flam'] + ' ' + con)
    return ' · '.join(out) or None

def fnum(s):
    try:
        return float(s)
    except (TypeError, ValueError):
        return None

def main(gaia_path, extra_path, hyg_path, out_path):
    gaia = {}
    for p in (gaia_path, extra_path):
        with open(p, newline='') as f:
            for r in csv.DictReader(f):
                gaia[r['source_id']] = r

    hyg = []
    with gzip.open(hyg_path, 'rt', newline='') as f:
        for r in csv.DictReader(f):
            if r['id'] == '0':
                continue  # the Sun
            hyg.append(r)

    # cross-match Gaia members with HYG for HIP/HD ids, Bayer/Flamsteed, IAU names and spectral types
    near = [h for h in hyg if abs(float(h['dec']) - 24.1) < 5 and abs(float(h['ra']) * 15 - 56.75) < 6]
    used_hyg = set()
    members = []
    for sid, r in gaia.items():
        ra, dec = float(r['ra']), float(r['dec'])
        best, bd = None, MATCH_ARCSEC
        for h in near:
            dra = (float(h['ra']) * 15 - ra) * math.cos(math.radians(dec))
            dd = float(h['dec']) - dec
            d = math.hypot(dra, dd) * 3600
            if d < bd:
                best, bd = h, d
        plx, plx_e, ruwe = fnum(r['parallax']), fnum(r['parallax_error']), fnum(r['ruwe'])
        good = plx is not None and plx > 0 and plx_e is not None and plx_e / plx < 0.02 and (ruwe or 9) < 1.4
        m = {
            'gaia': sid,
            'ra': round(ra, 5), 'dec': round(dec, 5),
            'plx': None if plx is None else round(plx, 4),
            'plxErr': None if plx_e is None else round(plx_e, 4),
            'ruwe': None if ruwe is None else round(ruwe, 2),
            'g': round(float(r['phot_g_mean_mag']), 2),
            'bpRp': None if fnum(r['bp_rp']) is None else round(float(r['bp_rp']), 3),
            'teff': None if fnum(r['teff_gspphot']) is None else round(float(r['teff_gspphot'])),
            'd': round(1000 / plx, 2) if good else CLUSTER_PC,
            'dSrc': 'gaia' if good else 'cluster',
        }
        if best is not None:
            used_hyg.add(best['id'])
            bf = designation(best)
            m.update({
                'hip': best['hip'] or None, 'hd': best['hd'] or None,
                'bf': bf or None, 'iau': best['proper'] or None,
                'spect': best['spect'] or None, 'v': fnum(best['mag']), 'bv': fnum(best['ci']),
            })
        members.append(m)
    members.sort(key=lambda m: m['g'])

    # naked-eye background sky from HYG (column arrays keep the file small)
    cols = {k: [] for k in ('ra', 'dec', 'd', 'mag', 'ci', 'hip', 'spect', 'name', 'bf')}
    for h in hyg:
        mag = fnum(h['mag'])
        if mag is None or mag > MAG_LIMIT_SKY or h['id'] in used_hyg:
            continue
        d = fnum(h['dist'])
        cols['ra'].append(round(float(h['ra']) * 15, 3))
        cols['dec'].append(round(float(h['dec']), 3))
        cols['d'].append(0 if d is None or d >= 99999 or d <= 0 else round(d, 1))
        cols['mag'].append(round(mag, 2))
        ci = fnum(h['ci'])
        cols['ci'].append(None if ci is None else round(ci, 2))
        cols['hip'].append(h['hip'] or '')
        cols['spect'].append(h['spect'] or '')
        cols['name'].append(h['proper'] or '')
        cols['bf'].append(designation(h) or '')

    out = {
        'about': 'Star positions for the assembl Lab Matariki sky explorer (educational, not production). '
                 'Cluster: Gaia DR3 (ESA/Gaia/DPAC, CC BY-SA 3.0 IGO), simple kinematic selection, cross-matched '
                 'to HYG v4.4 for HIP/HD ids, names and spectral types. Background: HYG v4.4 (astronexus, '
                 'CC BY-SA 4.0), stars to magnitude 6.5. This derived file is shared under CC BY-SA 4.0. '
                 'Built by scripts/build-matariki-sky-data.py.',
        'clusterPc': CLUSTER_PC,
        'clusterPcSource': 'Melis et al. 2014, Science 345, 1029 (VLBI): 136.2 ± 1.2 pc',
        'members': members,
        'sky': cols,
    }
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, separators=(',', ':'))
    print(len(members), 'cluster stars,', sum(1 for m in members if m['dSrc'] == 'gaia'), 'with Gaia distances;',
          len(cols['ra']), 'background stars')

if __name__ == '__main__':
    main(*sys.argv[1:5])
