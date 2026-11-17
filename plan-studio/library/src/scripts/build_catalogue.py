"""Build the assembl design inventory's files and catalogue.json from the four real sources.

usage:
  python3 -I scripts/build_catalogue.py files      # stage GLBs into public/glb and source stills into public/previews/source
  python3 -I scripts/build_catalogue.py catalogue  # write public/catalogue.json (needs .cache/measure.json from render_previews.py)

Sources (read-only; nothing in them is changed):
  1. Kate's curated asset site, https://assembl-curated-assets.katecoveny.chatgpt.site/ : assets.json (35 entries) and each
     entry's browser.glb, preview.png and manifest.json, downloaded to CURATED_DL on 17 Nov 2026.
  2. Kōwhai Studio: 33 pieces exported from Kate's generator. Meta: KOWHAI_META. Compressed GLBs: KOWHAI_OPT (the same
     files the twin serves as base64 from public/twin/lib/).
  3. The twin's library manifest, LIBRARY in TWIN_LIBRARY_TS (39 items: the 33 Kōwhai pieces and 6 curated ones).
  4. assembl's procedural objects library, src/objects (info blocks dumped by scripts/dump-objects-info.mjs to
     OBJECTS_INFO), and the ten newer Aotearoa objects exported as GLBs to NZ_EXPORT/<key>/.
"""
import hashlib, json, os, re, shutil, subprocess, sys, datetime
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from inventory_data import (CATEGORIES, KOWHAI, KOWHAI_DESC, CURATED_OWNER, MANU, OBJECTS, OBJECTS_ON_CURATED,
                            OBJECTS_NZ_EXPORT, FAMILIES)
from glbinfo import glb_json

ROOT = os.path.dirname(HERE)
PUBLIC = os.path.join(ROOT, 'public')
CACHE = os.path.join(ROOT, '.cache')
WORK = '/home/claude/work/inv'
CURATED_JSON = '/tmp/cas/assets.json'
CURATED_DL = f'{WORK}/casdl/assets'
CURATED_SITE = 'https://assembl-curated-assets.katecoveny.chatgpt.site/'
KOWHAI_META = '/tmp/kowhai/out/meta.json'
KOWHAI_RAW = '/tmp/kowhai/out'
KOWHAI_OPT = '/tmp/kowhai/opt'
TWIN_LIBRARY_TS = '/home/claude/manu/src/twin/library.ts'
OBJECTS_INFO = f'{WORK}/objects-info.json'
NZ_EXPORT = '/home/claude/manu-objects/shots/nz/glb'
OPT = f'{WORK}/opt'  # our own compressions (same settings as the twin's)
GT_DIR = '/home/claude/gltftools'  # @gltf-transform/cli 4.5.1
GT_OPTIMIZE = ['--compress', 'meshopt', '--texture-compress', 'webp', '--flatten', 'false', '--join', 'false',
               '--palette', 'false', '--simplify', 'false']
SNAPSHOT = '2026-11-17'

# --------------------------------------------------------------------------------------------------- sources


def twin_library():
    """LIBRARY entries from src/twin/library.ts: id, role, title, dims, fit, turn (read, not imported)."""
    src = open(TWIN_LIBRARY_TS, encoding='utf-8').read()
    out = {}
    for m in re.finditer(r"\{ id: '([^']+)', role: '([^']+)', title: '([^']+)', dims: '([^']+)', licence: (\w+)([^}]*)\}", src):
        rest = m.group(6)
        fit = re.search(r"fit: '(\w+)'", rest)
        turn = re.search(r'turn: ([^,}]+)', rest)
        out[m.group(1)] = {'id': m.group(1), 'role': m.group(2), 'title': m.group(3).replace('’', '’'),
                           'dims': m.group(4), 'licenceConst': m.group(5), 'fit': fit.group(1) if fit else 'floor',
                           'turn': turn.group(1).strip() if turn else None}
    return out


def sha256(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for b in iter(lambda: f.read(1 << 20), b''):
            h.update(b)
    return h.hexdigest()


def gt_optimize(src, dst):
    if os.path.exists(dst):
        return
    r = subprocess.run(['npx', 'gltf-transform', 'optimize', src, dst, *GT_OPTIMIZE], cwd=GT_DIR, capture_output=True, text=True)
    if r.returncode != 0:
        raise SystemExit(f'gltf-transform failed for {src}: {r.stderr[-400:]}')


def gt_meshopt(src, dst):
    if os.path.exists(dst):
        return
    r = subprocess.run(['npx', 'gltf-transform', 'meshopt', src, dst, '--level', 'high'], cwd=GT_DIR, capture_output=True, text=True)
    if r.returncode != 0:
        raise SystemExit(f'gltf-transform failed for {src}: {r.stderr[-400:]}')

# --------------------------------------------------------------------------------------------------- plan


def plan():
    """Every inventory item with where its viewer GLB comes from and how it was made. One entry per real item."""
    curated = {e['id']: e for e in json.load(open(CURATED_JSON, encoding='utf-8'))}
    kmeta = {e['id']: e for e in json.load(open(KOWHAI_META, encoding='utf-8'))}
    lib = twin_library()
    info = {i['key']: i for i in json.load(open(OBJECTS_INFO, encoding='utf-8'))}
    items = []

    # Kōwhai Studio (33)
    for kid, (cat, typ, mats) in KOWHAI.items():
        items.append({'id': 'kowhai-' + kid.lower(), 'src': 'kowhai', 'kid': kid, 'cat': cat, 'type': typ, 'mats': mats,
                      'glbFrom': f'{KOWHAI_OPT}/{kid}.glb', 'made': 'twin', 'meta': kmeta[kid], 'twin': lib.get(kid)})
    # curated owner-supplied (9)
    for cid, (iid, cat, typ, title, mats, twin_id, desc) in CURATED_OWNER.items():
        folder = curated[cid]['glb'].split('/')[1]
        if twin_id:
            frm, made = f'{KOWHAI_OPT}/{twin_id}.glb', 'twin'
        else:
            frm, made = f'{OPT}/{iid}.glb', 'optimize'
            os.makedirs(OPT, exist_ok=True)
            gt_optimize(f'{CURATED_DL}/{folder}/browser.glb', frm)
        items.append({'id': iid, 'src': 'curated', 'cid': cid, 'folder': folder, 'cat': cat, 'type': typ, 'mats': mats,
                      'title': title, 'desc': desc, 'glbFrom': frm, 'made': made, 'cur': curated[cid],
                      'twin': lib.get(twin_id) if twin_id else None})
    # Manu birds and sprigs (11)
    for suffix, (iid, typ, title, sci, length) in MANU.items():
        cid = f'intake-20261117-{suffix}'
        raw = f'{CURATED_DL}/{cid}/browser.glb'
        j, _, _ = glb_json(raw)
        if 'EXT_meshopt_compression' in j.get('extensionsUsed', []):
            frm, made = raw, 'asis'
        else:
            frm, made = f'{OPT}/{iid}.glb', 'meshopt'
            gt_meshopt(raw, frm)
        items.append({'id': iid, 'src': 'manu', 'cid': cid, 'folder': cid, 'cat': 'nature', 'type': typ, 'title': title,
                      'sci': sci, 'length': length, 'glbFrom': frm, 'made': made, 'cur': curated[cid]})
    # procedural objects (25): 15 also on the curated site, 10 from the newer export
    for key, (cat, typ, mats) in OBJECTS.items():
        iid = 'objects-' + key
        if key in OBJECTS_ON_CURATED:
            cid = OBJECTS_ON_CURATED[key]
            items.append({'id': iid, 'src': 'objects', 'key': key, 'cid': cid, 'folder': cid, 'cat': cat, 'type': typ,
                          'mats': mats, 'glbFrom': f'{CURATED_DL}/{cid}/browser.glb', 'made': 'asis', 'cur': curated[cid],
                          'info': info[key]})
        else:
            web = f'{NZ_EXPORT}/{key}/{key}_web.glb'
            frm = f'{OPT}/{iid}.glb'
            gt_optimize(web, frm)
            items.append({'id': iid, 'src': 'objects', 'key': key, 'cat': cat, 'type': typ, 'mats': mats, 'glbFrom': frm,
                          'made': 'optimize', 'nzweb': web, 'nzhq': f'{NZ_EXPORT}/{key}/{key}_hq.glb', 'info': info[key]})
    # every curated entry, twin entry and object is used exactly once
    used_cur = {i.get('cid') for i in items if i.get('cid')}
    assert used_cur == set(curated), set(curated) ^ used_cur
    used_twin = {i['twin']['id'] for i in items if i.get('twin')}
    assert used_twin == set(lib), set(lib) ^ used_twin
    assert {i['key'] for i in items if i['src'] == 'objects'} == set(info)
    assert len({i['id'] for i in items}) == len(items) == 78, len(items)
    return items, curated, lib, info

# --------------------------------------------------------------------------------------------------- files


def stage_files():
    items, curated, lib, info = plan()
    gdir = os.path.join(PUBLIC, 'glb')
    sdir = os.path.join(PUBLIC, 'previews', 'source')
    os.makedirs(gdir, exist_ok=True)
    os.makedirs(sdir, exist_ok=True)
    for it in items:
        dst = os.path.join(gdir, it['id'] + '.glb')
        shutil.copyfile(it['glbFrom'], dst)
        if it['src'] == 'curated':
            im = Image.open(f"{CURATED_DL}/{it['folder']}/preview.png").convert('RGB')
            im.thumbnail((900, 900), Image.LANCZOS)
            im.save(os.path.join(sdir, it['id'] + '.webp'), 'WEBP', quality=80, method=6)
    json.dump([{'id': i['id'], 'glb': f"glb/{i['id']}.glb", 'cat': i['cat']} for i in items],
              open(os.path.join(CACHE, 'render-list.json'), 'w'), indent=1)
    total = sum(os.path.getsize(os.path.join(gdir, f)) for f in os.listdir(gdir))
    print(f'staged {len(items)} GLBs, {total / 1e6:.2f} MB')

# --------------------------------------------------------------------------------------------------- catalogue


RIGHTS = {
    'status': 'cleared-by-owner',
    'label': 'Cleared for use by Kate Hudson (owner); not independently verified',
    'commercialUse': 'not claimed',
}
KS_ATTR = 'Kōwhai Studio 3D generator (Kate Hudson, assembl)'
MATERIAL_FAMILIES = [
    ('timber', r'timber|wood|ash\b|oak|beech|rimu|tōtara|pine|maple|walnut|hardwood|plywood|hoop-pine'),
    ('metal', r'steel|brass|stainless|iron|metal|galvanised|nickel|chrome|alloy|wire|rivet|staple|screw'),
    ('stone & concrete', r'stone|marble|travertine|alabaster|concrete|masonry|mortar|coping'),
    ('textile', r'wool|linen|flax|bouclé|fabric|leather|jute|upholster|cushion|ticking|merino|sheer|towel|throw'),
    ('glass & ceramic', r'glass|ceramic|mirror|opal'),
    ('plant', r'frond|leaf|leaves|trunk|flower|bark|crownshaft|tussock|mulch'),
    ('feather', r'feather'),
    ('paint & coatings', r'paint|enamel|lacquer|gloss'),
]


def fmt_bytes(n):
    return f'{n / 1e6:.1f} MB' if n >= 1e6 else f'{round(n / 1e3)} KB'


def file_entry(path, url, role, label, derived):
    j, ver, length = glb_json(path)
    tris = 0
    for m in j.get('meshes', []):
        for p in m['primitives']:
            acc = j['accessors'][p['indices']] if 'indices' in p else j['accessors'][p['attributes']['POSITION']]
            tris += acc['count'] // 3
    return {'role': role, 'label': label, 'url': url, 'format': 'glb', 'mime': 'model/gltf-binary',
            'bytes': os.path.getsize(path), 'sha256': sha256(path), 'gltf': '2.0',
            'extensionsRequired': j.get('extensionsRequired', []), 'triangles': tris,
            'meshes': len(j.get('meshes', [])), 'materials': len(j.get('materials', [])),
            'textures': len(j.get('textures', [])), 'derivedFrom': derived}


def mm(v):
    return round(v * 1000)


def build_catalogue():
    items, curated, lib, info = plan()
    meas = json.load(open(os.path.join(CACHE, 'measure.json')))
    cat_titles = dict(CATEGORIES)
    out = []
    for it in items:
        iid = it['id']
        m = meas[iid]
        glb_path = os.path.join(PUBLIC, 'glb', iid + '.glb')
        twin = it.get('twin')
        e = {'id': iid}
        prov, notes, not_deployed = [], [], []
        source_ids, collections = {}, []
        desc = ''
        stated = None
        if it['src'] == 'kowhai':
            k = it['meta']
            e['title'] = twin['title']
            desc = KOWHAI_DESC.get(it['kid'], k['notes'])
            stated = {'text': twin['dims'] + ' (W × D × H)', 'source': 'Kōwhai Studio generator, as written in the twin library'}
            collections = ['kowhai', 'twin']
            source_ids = {'kowhai': it['kid'], 'twin': it['kid']}
            licence = {'name': 'CC BY 4.0', 'url': 'https://creativecommons.org/licenses/by/4.0/', 'attribution': KS_ATTR,
                       'scope': 'Procedural mesh and PBR maps'}
            stage = 'Generated; in use in the twin library'
            raw = f"{KOWHAI_RAW}/{it['kid']}.glb"
            prov += ['Generated in Kōwhai Studio, Kate Hudson’s NZ Scandi minimalist 3D asset PBR generator, and exported as GLB on 17 Nov 2026.',
                     'Compressed for the web with glTF-Transform (Meshopt geometry, WebP textures): the same file the twin loads for the “' + twin['role'] + '” slot.']
            not_deployed.append({'label': 'Uncompressed generator export (GLB)', 'bytes': os.path.getsize(raw), 'where': 'kept offline with the Kōwhai Studio export; not deployed, to keep the inventory light'})
            notes.append('Generated from a written description. Proportions and finishes are design intent, not a measured product.')
        elif it['src'] == 'curated':
            c = it['cur']
            man = json.load(open(f"{CURATED_DL}/{it['folder']}/manifest.json", encoding='utf-8'))
            e['title'] = it['title'] or twin['title']
            desc = it['desc']
            stated = {'text': c['dimensions'], 'source': 'Kate’s curated asset site (measured from the refined model there)'}
            collections = ['curated'] + (['twin'] if twin else [])
            source_ids = {'curated': c['id']}
            if twin:
                source_ids['twin'] = twin['id']
            generator_id = c['source'].split('·')[-1].strip()
            source_ids['generator'] = generator_id
            licence = {'name': 'Owner supplied', 'url': None, 'attribution': 'Kate Hudson, assembl',
                       'scope': 'Refined model, browser GLB and Blender masters on Kate’s curated site'}
            if 'CC BY 4.0' in c['licence']:
                licence['statedBySource'] = 'CC BY 4.0, as stated by the source generator'
            stage = c['status']
            prov += [f"Supplied by Kate as {generator_id} and refined on her curated asset site ({c['version']}).",
                     'Refinement notes: ' + c['notes']]
            if it['made'] == 'twin':
                prov.append(f"Compressed for the web with glTF-Transform (Meshopt geometry, WebP textures) from the curated browser GLB: the same file the twin loads as {twin['id']}.")
            else:
                prov.append('Compressed for the web for this inventory with glTF-Transform (Meshopt geometry, WebP textures) from the curated browser GLB, with the settings the twin library uses.')
            notes.append('Curated site QA: ' + c['qa'])
            notes.append('Quality note on the curated site: ' + man.get('quality', ''))
            files = man.get('files', {})
            for k, label in [('browser.glb', 'Uncompressed browser GLB'), ('master.blend', 'Blender master (master.blend)'), ('studio.blend', 'Blender studio scene (studio.blend)')]:
                if k in files:
                    not_deployed.append({'label': label, 'bytes': files[k]['bytes'], 'where': 'Kate’s curated asset site; not deployed here, to keep the inventory under about 40 MB'})
        elif it['src'] == 'manu':
            c = it['cur']
            e['title'] = it['title']
            if it['type'] == 'Bird':
                desc = f"{it['title'].split(',')[0]} ({it['sci']}), perching in rest pose, with every feather as real geometry and per-vertex colour. Drawn at a common field-guide size, not life size ({it['length']})."
            else:
                desc = f"A flowering sprig of {it['title'].split(',')[0].lower()} ({it['sci']}), one of the perches in the Manu library, with per-vertex colour."
            stated = {'text': c['dimensions'], 'source': 'Kate’s curated asset site (bounds of the imported model)'}
            collections = ['curated', 'manu']
            source_ids = {'curated': c['id'], 'manu': it['id'].split('-', 1)[1]}
            licence = {'name': 'MIT', 'url': 'https://opensource.org/license/mit', 'attribution': '© 2026 assembl (species, flora and export); feather engine © 2026 Theo Tillberg, MIT',
                       'scope': 'Model and embedded texture'}
            stage = c['status']
            prov += ['Built in assembl’s Manu library (birds of Aotearoa on Theo Tillberg’s “12 / Feather” engine, MIT) and exported as GLB.',
                     'Added to Kate’s curated asset site as an owner-supplied assembl bundle on 17 Nov 2026.']
            if it['made'] == 'meshopt':
                raw = f"{CURATED_DL}/{it['cid']}/browser.glb"
                prov.append(f"The curated file is uncompressed ({fmt_bytes(os.path.getsize(raw))}); this inventory serves a Meshopt-quantised copy made with glTF-Transform.")
                not_deployed.append({'label': 'Uncompressed GLB from the curated site', 'bytes': os.path.getsize(raw), 'where': 'Kate’s curated asset site; not deployed here'})
            else:
                prov.append('Served exactly as the curated site’s compressed browser GLB (Meshopt geometry, WebP texture).')
            notes.append('Curated site QA: ' + c['qa'].strip())
            if it['type'] == 'Bird':
                notes.append('Art-directed from field-guide descriptions and photographs; not a scan or a measured specimen.')
        else:  # objects
            inf = it['info']
            e['title'] = inf['name']
            desc = inf['summary']
            stated = {'text': inf['dimensions'], 'source': 'assembl objects library (as built, from its info block)'}
            collections = ['objects']
            source_ids = {'objects': it['key']}
            licence = {'name': 'MIT', 'url': 'https://opensource.org/license/mit', 'attribution': '© 2026 assembl', 'scope': 'Model, procedural textures and source'}
            prov.append('An original design generated in three.js by assembl’s procedural objects library (src/objects), with named parts, procedural PBR textures and glTF extras metadata.')
            for s in inf['sources']:
                prov.append('Source: ' + s)
            for a in inf['assumptions']:
                notes.append('Assumed or unverified: ' + a)
            if 'cid' in it:
                c = it['cur']
                collections.insert(0, 'curated')
                source_ids['curated'] = c['id']
                stage = c['status']
                prov.append('Exported as GLB (Meshopt geometry, WebP textures) and added to Kate’s curated asset site on 17 Nov 2026; served here exactly as that browser GLB.')
                notes.append('Curated site QA: ' + c['qa'].strip())
            else:
                stage = 'New export, not yet reviewed on the curated site'
                prov.append(f"Exported on 17 Nov 2026 as a browser-optimised GLB ({fmt_bytes(os.path.getsize(it['nzweb']))}) and compressed for this inventory with glTF-Transform (Meshopt geometry, WebP textures).")
                not_deployed.append({'label': 'Uncompressed browser-optimised GLB (textures to 512 px)', 'bytes': os.path.getsize(it['nzweb']), 'where': 'objects export; not deployed here'})
                not_deployed.append({'label': 'High-quality GLB (textures to 2048 px)', 'bytes': os.path.getsize(it['nzhq']), 'where': 'objects export; not deployed here (too large)'})
        e['description'] = desc
        e['category'] = it['cat']
        e['categoryTitle'] = cat_titles[it['cat']]
        e['type'] = it['type']
        if it.get('sci'):
            e['scientificName'] = it['sci']
        e['collections'] = collections
        e['sourceIds'] = source_ids
        if twin:
            e['twinRole'] = twin['role']
            turn = twin['turn']
            turn = round(eval(turn.replace('Math.PI', '3.141592653589793'), {'__builtins__': {}}), 6) if turn else 0
            e['twin'] = {'id': twin['id'], 'role': twin['role'], 'fit': twin['fit'], 'turnRadians': turn}
        mats = it.get('mats') or (['Feathers as geometry', 'Per-vertex colour', 'Embedded feather texture'] if it.get('type') == 'Bird' else ['Stems, leaves and flowers', 'Per-vertex colour'])
        e['materials'] = mats
        text = ' '.join(mats + [desc]).lower()
        e['materialTags'] = [name for name, rx in MATERIAL_FAMILIES if re.search(rx, text)]
        b = m['bounds']
        e['dimensions'] = {
            'stated': stated['text'], 'statedSource': stated['source'],
            'modelBoundsMm': {'x': mm(b[0]), 'y': mm(b[1]), 'z': mm(b[2])},
            'modelBoundsNote': 'Measured from this GLB by the inventory build (three.js bounding box, metres to mm; x across, y up, z depth).',
            'verified': False,
        }
        if it['src'] == 'manu':
            e['dimensions']['scale'] = 'not to scale: field-guide size'
        e['formats'] = ['glb']
        derived = {'twin': 'Twin library file (glTF-Transform optimize: Meshopt + WebP)', 'optimize': 'glTF-Transform 4.5.1 optimize: Meshopt + WebP',
                   'meshopt': 'glTF-Transform 4.5.1 meshopt (quantised)', 'asis': 'Unchanged from the curated site'}[it['made']]
        e['files'] = [file_entry(glb_path, f'glb/{iid}.glb', 'web', 'Compressed GLB (Meshopt + WebP)' if 'EXT_texture_webp' in glb_json(glb_path)[0].get('extensionsRequired', []) else 'Compressed GLB (Meshopt)', derived)]
        e['preview'] = {'url': f'previews/{iid}.webp', 'kind': 'render', 'width': 720, 'height': 720,
                        'note': 'Rendered from the GLB above by the inventory build: three.js, studio light, ivory ground, headless Chrome.'}
        if it['src'] == 'curated':
            e['sourceStill'] = {'url': f'previews/source/{iid}.webp', 'kind': 'render', 'note': 'Blender render from Kate’s curated asset site.'}
        e['swatch'] = m.get('swatch')
        e['licence'] = licence
        e['rights'] = dict(RIGHTS)
        notes.append('Inventory build, 17 Nov 2026: this GLB loaded and rendered in three.js r187 (GLTFLoader with the Meshopt decoder) in headless Chrome with SwiftShader WebGL, which made the preview still and measured the bounds. Not checked on a physical phone or in desktop modelling tools.')
        e['verification'] = {
            'readiness': 'preview',
            'readinessLabel': 'Preview asset, not production-verified',
            'sourceStatus': stage,
            'dimensionalAccuracy': 'unverified',
            'photoreal': 'not claimed',
            'notes': notes,
        }
        e['provenance'] = prov
        if iid in FAMILIES:
            fam, ftitle = FAMILIES[iid]
            e['family'] = {'id': fam, 'title': ftitle, 'members': [k for k, v in FAMILIES.items() if v[0] == fam]}
        e['notDeployed'] = not_deployed
        out.append(e)

    order = {k: i for i, (k, _) in enumerate(CATEGORIES)}
    out.sort(key=lambda e: order[e['category']])  # stable: source order within a category
    counts = {}
    for e in out:
        for c in e['collections']:
            counts[c] = counts.get(c, 0) + 1
    deploy_glb = sum(f['bytes'] for e in out for f in e['files'])
    cat = {
        '$schema': './catalogue.schema.json',
        'schema': 'assembl.design-inventory.v1',
        'title': 'assembl design inventory',
        'built': datetime.datetime.now(datetime.timezone.utc).replace(microsecond=0).isoformat().replace('+00:00', 'Z'),
        'snapshot': SNAPSHOT,
        'live': False,
        'note': 'A static snapshot built from four sources on 17 Nov 2026. It is not a live database: items change when the catalogue is rebuilt.',
        'base': '/plan-studio/library/',
        'urlsRelativeTo': 'this file',
        'rightsDefault': RIGHTS,
        'categories': [{'id': k, 'title': t, 'count': sum(1 for e in out if e['category'] == k)} for k, t in CATEGORIES],
        'collections': [
            {'id': 'curated', 'title': 'Kate’s curated asset site', 'count': counts.get('curated', 0),
             'source': CURATED_SITE + 'assets.json', 'note': '35 entries: 9 owner-supplied refined pieces, 15 procedural objects and 11 birds and flora from assembl’s own library. Files were copied into this inventory; nothing links to that site.'},
            {'id': 'kowhai', 'title': 'Kōwhai Studio', 'count': counts.get('kowhai', 0),
             'source': 'Kate’s Kōwhai Studio generator (NZ Scandi minimalist 3D asset PBR generator)', 'note': '33 pieces exported on 17 Nov 2026, CC BY 4.0.'},
            {'id': 'twin', 'title': 'Twin library', 'count': counts.get('twin', 0),
             'source': 'LIBRARY in src/twin/library.ts (Plan Studio twins)', 'note': '39 pieces the twin places by role: the 33 Kōwhai pieces and 6 curated ones.'},
            {'id': 'objects', 'title': 'assembl objects library', 'count': counts.get('objects', 0),
             'source': 'src/objects/catalogue.ts (assembl, MIT)', 'note': '25 procedural objects with sources and assumptions; 15 of them are also on the curated site.'},
            {'id': 'manu', 'title': 'Manu: birds and flora of Aotearoa', 'count': counts.get('manu', 0),
             'source': 'assembl Manu library (MIT), via Kate’s curated site', 'note': '8 birds and 3 flowering sprigs.'},
        ],
        'totals': {'items': len(out), 'glbBytes': deploy_glb},
        'items': out,
    }
    with open(os.path.join(PUBLIC, 'catalogue.json'), 'w', encoding='utf-8') as f:
        json.dump(cat, f, ensure_ascii=False, indent=1)
    print(f"catalogue: {len(out)} items, GLBs {deploy_glb / 1e6:.2f} MB; collections {counts}")


if __name__ == '__main__':
    os.makedirs(CACHE, exist_ok=True)
    step = sys.argv[1] if len(sys.argv) > 1 else 'files'
    if step == 'files':
        stage_files()
    elif step == 'catalogue':
        build_catalogue()
    else:
        raise SystemExit(__doc__)
