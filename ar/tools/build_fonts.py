"""Build the 3D text fonts for assembl AR.

Converts the static Instrument Sans and IBM Plex Mono WOFF files from the @fontsource npm packages (SIL OFL 1.1)
into three.js "typeface" JSON (the format FontLoader reads), plus two extras the AR studio uses:
  capHeight  the cap height in font units, so "letter height" means the height of a capital letter
  kern       pair kerning from the GPOS 'kern' feature, as {"AV": -45, ...} in font units

Usage (from the repo root, after `npm pack @fontsource/instrument-sans @fontsource/ibm-plex-mono` and untarring):
  python3 ar/tools/build_fonts.py <instrument-sans package dir> <ibm-plex-mono package dir>

Glyph outlines are TrueType quadratics. three's Font reads "q" as end point first, then control point, and "b" as
end point first, then both control points, so that is the order written here. TrueType outer contours run clockwise
in y-up font space, which is what three's ShapePath.toShapes() expects by default.
"""
import json, sys, pathlib
from fontTools.ttLib import TTFont
from fontTools.pens.basePen import BasePen

OUT = pathlib.Path(__file__).resolve().parent.parent / 'fonts'

# Basic Latin, Latin-1, Latin Extended-A (macrons for te reo Māori: Āā Ēē Īī Ōō Ūū) and common punctuation.
CHARS = list(range(0x20, 0x7F)) + list(range(0xA0, 0x100)) + list(range(0x100, 0x180)) + \
    [0x2018, 0x2019, 0x201C, 0x201D, 0x2013, 0x2014, 0x2026, 0x2022, 0x20AC, 0x2122, 0x2190, 0x2192, 0x00D7]


KERN_SET = set('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,:;!?&-\'"()/ ĀāĒēĪīŌōŪū\u2018\u2019\u201C\u201D\u2013\u2014')


class OutlinePen(BasePen):
    def __init__(self, glyphSet):
        super().__init__(glyphSet)
        self.cmds = []

    def _moveTo(self, p):
        self.cmds.append('m %d %d' % (round(p[0]), round(p[1])))

    def _lineTo(self, p):
        self.cmds.append('l %d %d' % (round(p[0]), round(p[1])))

    def _qCurveToOne(self, c, p):
        self.cmds.append('q %d %d %d %d' % (round(p[0]), round(p[1]), round(c[0]), round(c[1])))

    def _curveToOne(self, c1, c2, p):
        self.cmds.append('b %d %d %d %d %d %d' % (round(p[0]), round(p[1]), round(c1[0]), round(c1[1]), round(c2[0]), round(c2[1])))

    def _closePath(self):
        pass

    def _endPath(self):
        pass


def kerning(font, cmap_rev):
    """Pair kerning (x advance adjustments) from GPOS PairPos lookups used by the 'kern' feature."""
    out = {}
    if 'GPOS' not in font:
        return out
    gpos = font['GPOS'].table
    lookups = set()
    for fr in gpos.FeatureList.FeatureRecord:
        if fr.FeatureTag == 'kern':
            lookups.update(fr.Feature.LookupListIndex)
    glyph_chars = {}
    for g, chars in cmap_rev.items():
        glyph_chars[g] = chars
    for li in sorted(lookups):
        lookup = gpos.LookupList.Lookup[li]
        for st in lookup.SubTable:
            if lookup.LookupType == 9:
                st = st.ExtSubTable
            if getattr(st, 'LookupType', 2) != 2 and lookup.LookupType not in (2, 9):
                continue
            cov = st.Coverage.glyphs
            if st.Format == 1:
                for i, first in enumerate(cov):
                    if first not in glyph_chars:
                        continue
                    for rec in st.PairSet[i].PairValueRecord:
                        v = getattr(rec.Value1, 'XAdvance', 0) if rec.Value1 else 0
                        if not v or rec.SecondGlyph not in glyph_chars:
                            continue
                        for a in glyph_chars[first]:
                            for b in glyph_chars[rec.SecondGlyph]:
                                out.setdefault(a + b, v)
            elif st.Format == 2:
                cd1 = st.ClassDef1.classDefs
                cd2 = st.ClassDef2.classDefs
                seconds = {}
                for g in glyph_chars:
                    seconds.setdefault(cd2.get(g, 0), []).append(g)
                for first in cov:
                    if first not in glyph_chars:
                        continue
                    c1 = cd1.get(first, 0)
                    row = st.Class1Record[c1].Class2Record
                    for c2, rec in enumerate(row):
                        v = getattr(rec.Value1, 'XAdvance', 0) if rec.Value1 else 0
                        if not v:
                            continue
                        for second in seconds.get(c2, []):
                            for a in glyph_chars[first]:
                                for b in glyph_chars[second]:
                                    out.setdefault(a + b, v)
    return out


def convert(files, family, out_name, label):
    glyphs, kern = {}, {}
    meta = None
    for path in files:
        font = TTFont(path)
        upm = font['head'].unitsPerEm
        assert upm == 1000, 'expected 1000 units per em'
        cmap = font.getBestCmap()
        gs = font.getGlyphSet()
        hmtx = font['hmtx']
        rev = {}
        for code in CHARS:
            if code not in cmap:
                continue
            ch = chr(code)
            gname = cmap[code]
            rev.setdefault(gname, []).append(ch)
            if ch in glyphs:
                continue
            pen = OutlinePen(gs)
            gs[gname].draw(pen)
            adv = hmtx[gname][0]
            g = {'ha': adv, 'x_min': 0, 'x_max': adv, 'o': ' '.join(pen.cmds)}
            glyphs[ch] = g
        for k, v in kerning(font, rev).items():
            # keep the pairs people actually type, and only adjustments big enough to see
            if k[0] in KERN_SET and k[1] in KERN_SET and abs(v) >= 8:
                kern.setdefault(k, v)
        if meta is None:
            os2, hhea, post, head = font['OS/2'], font['hhea'], font['post'], font['head']
            meta = {
                'familyName': family,
                'ascender': hhea.ascent, 'descender': hhea.descent,
                'underlinePosition': post.underlinePosition, 'underlineThickness': post.underlineThickness,
                'boundingBox': {'xMin': head.xMin, 'yMin': head.yMin, 'xMax': head.xMax, 'yMax': head.yMax},
                'resolution': upm,
                'capHeight': getattr(os2, 'sCapHeight', 700) or 700,
                'xHeight': getattr(os2, 'sxHeight', 500) or 500,
                'original_font_information': {
                    'fullName': font['name'].getDebugName(4), 'version': font['name'].getDebugName(5),
                    'licence': 'SIL Open Font License 1.1', 'copyright': font['name'].getDebugName(0)},
            }
    data = dict(meta)
    data['label'] = label
    data['glyphs'] = glyphs
    data['kern'] = kern
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / out_name).write_text(json.dumps(data, separators=(',', ':'), ensure_ascii=False))
    print(out_name, len(glyphs), 'glyphs', len(kern), 'kern pairs', (OUT / out_name).stat().st_size, 'bytes')


if __name__ == '__main__':
    inst = pathlib.Path(sys.argv[1]) / 'files'
    plex = pathlib.Path(sys.argv[2]) / 'files'
    for w, lab in (('600', 'Instrument Sans SemiBold'), ('500', 'Instrument Sans Medium')):
        convert([inst / f'instrument-sans-latin-{w}-normal.woff', inst / f'instrument-sans-latin-ext-{w}-normal.woff'],
                'Instrument Sans', f'instrument-sans-{w}.json', lab)
    convert([plex / 'ibm-plex-mono-latin-500-normal.woff', plex / 'ibm-plex-mono-latin-ext-500-normal.woff'],
            'IBM Plex Mono', 'ibm-plex-mono-500.json', 'IBM Plex Mono Medium')
