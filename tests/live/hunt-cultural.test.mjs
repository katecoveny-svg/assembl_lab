// The kaupapa Māori and Indigenous lens, in the ranking rules (architecture/js/hunt-rank.js). Offline: hand-made notices only, no network.
// These tests keep the word lists honest: what must match, what must NOT, buyers, the "always show" setting and the boost.
import test from 'node:test';
import assert from 'node:assert/strict';
import { culturalMatch, scoreTender, rankTenders, parseLens, lensIsEmpty, SECTORS, CULTURAL_PLACES, CULTURAL_DESIGN, CULTURAL_BUYERS, CULTURAL_BUYER_PREFIXES, fold } from '../../api/_feeds/hunt.js';
import { fetchHunt } from '../../api/_feeds/hunt.js';

const NOW = new Date('2026-11-22T10:00:00+13:00');
const T = (o = {}) => ({ id: '1', title: 'Hall refurbishment', buyer: 'Hamilton City Council', url: 'https://www.gets.govt.nz//X/ExternalTenderDetails.htm?id=1', regions: ['Waikato'], categories: [], closes: '2026-12-20T04:00:00.000Z', opened: '2026-11-20T01:00:00.000Z', overview: '', value: null, valueText: '', ...o });
const on = (title, buyer = 'Some Council', overview = '') => culturalMatch({ title, buyer, overview });

test('the sector is there, with its label and a macron', () => {
  assert.equal(SECTORS.kaupapa.label, 'Kaupapa Māori and Indigenous');
  assert.ok(SECTORS.kaupapa.words.includes('marae') && SECTORS.kaupapa.words.includes('mātauranga Māori'));
});

test('every word is written with correct macrons in the source, and is not a bare common word', () => {
  const all = [...CULTURAL_PLACES, ...CULTURAL_DESIGN, ...CULTURAL_BUYERS, ...CULTURAL_BUYER_PREFIXES];
  for (const bad of ['te', 'whare', 'trust', 'maori', 'ngati']) assert.ok(!all.map((w) => w.toLowerCase()).includes(bad), `"${bad}" must not stand alone`);
  for (const w of ['kōhanga reo', 'wānanga', 'papakāinga', 'urupā', 'ātea', 'pā site', 'Māori housing', 'hapū', 'rūnanga', 'Te Puni Kōkiri', 'Whai Kāinga Whai Oranga', 'Ngāti', 'Ngāi', 'Ngā', 'Te Mātāwai', 'whare tūpuna']) assert.ok(all.includes(w), `${w} is in a list with its macrons`);
  assert.deepEqual(all.filter((w) => /\b(Maori|Matawai|Kokiri|kainga|wananga|papakainga|runanga|hapu)\b/.test(w)), [], 'no word is written without its macrons');
});

test('a place name that only contains a Māori word is not cultural work; the building is', () => {
  assert.equal(on('Te Atatu library carpark resurfacing').on, false, 'Te Atatu is a place');
  assert.deepEqual(on('Te Atatū marae wharekai upgrade'), { on: true, why: ['marae', 'wharekai'] });
  assert.equal(on('Whare Ra Road reseal').on, false, 'a street name with "whare" in it');
  assert.equal(on('Whare Ra heritage assessment').on, false);
  assert.equal(on('Pouakai Crescent footpath renewal').on, false, '"pou" is a whole word only');
  assert.equal(on('Waitematā Harbour Bridge maintenance').on, false);
  assert.equal(on('Te Awamutu library refurbishment', 'Waipā District Council').on, false);
  assert.equal(on('Community trust hall fit-out', 'Aroha Community Trust').on, false, '"trust" on its own never matches');
  assert.equal(on('Whare kai').on, true, 'a whare kai is a dining hall');
  assert.equal(on('New whare for the depot').on, false, '"whare" on its own never matches');
});

test('Wesley College\'s Taha Māori, and the other building types, match', () => {
  assert.deepEqual(on('Wesley College Taha Māori building').why, ['taha Māori']);
  for (const t of ['Wharenui restoration', 'Wharekura classroom block', 'Kura kaupapa Māori new classrooms', 'Kōhanga reo relocation', 'Papakāinga masterplan', 'Kaumātua housing design', 'Urupā fencing and entrance', 'Ātea paving design', 'Pā site interpretation shelter', 'Pasifika centre concept design', 'Pacific church hall design', 'Fale design services', 'Whare karakia fit-out', 'Whare tūpuna conservation', 'Whare taonga gallery', 'Māori housing programme feasibility', 'Hauora Māori clinic', 'Māori health provider clinic fit-out', 'Cultural centre feasibility study', 'Wānanga campus masterplan']) assert.equal(on(t).on, true, t);
});

test('macrons do not matter in the notice: GETS often drops them', () => {
  assert.equal(on('Papakainga housing design').on, true); assert.equal(on('KOHANGA REO fitout').on, true); assert.equal(on('Whare tupuna and whare tūpuna').why.length, 1, 'both spellings are one word once folded');
  assert.equal(fold('Ngāti Whātua Ōrākei'), 'ngati whatua orakei');
});

test('design language matches whole words only', () => {
  for (const t of ['Te Aranga design principles review', 'Mana whenua engagement and cultural narrative', 'Tangata whenua cultural landscape assessment', 'Iwi engagement for the new library', 'Mātauranga Māori input to the design', 'Kaitiakitanga framework', 'Whakairo and tukutuku panels for the foyer', 'Carving and pou installation', 'Taonga display cases', 'Te Tiriti obligations in the brief', 'Cultural design advice']) assert.equal(on(t).on, true, t);
  assert.equal(on('Taongan pipe supply').on, false); 
});

test('"indigenous" means a people, not plants', () => {
  assert.equal(on('Indigenous architecture and design advice').on, true);
  assert.equal(on('Indigenous planting and landscaping at the reserve').on, false);
  assert.equal(on('Indigenous vegetation clearance').on, false);
  assert.equal(on('Indigenous planting', 'x', 'and Indigenous design leads for the new centre').on, true, 'a second, real use still counts');
});

test('buyers: named entities and funders are matched in the buyer field and in the text', () => {
  for (const b of ['Te Puni Kōkiri', 'Te Tumu Paeroa', 'Te Arawhiti', 'Te Mātāwai', 'Waikato-Tainui', 'Te Uru Taumatua', 'Te Rūnanga o Ngāti Whātua', 'Te Rūnanga o Ngāi Tahu', 'Ngāti Whātua Ōrākei Trust', 'Ōtākou Hapū Trust Board', 'Ahu Whenua Trust (Mangatū)', 'Parihaka Māori Incorporation', 'Tūhoe Māori Land Trust']) assert.equal(on('Building refurbishment', b).on, true, b);
  assert.deepEqual(on('Hall design', 'Ngāti Porou Whānau Ora').why, ['Ngāti']);
  assert.deepEqual(on('Hall design', 'Ngāi Tahu Property').why, ['Ngāi']);
  assert.ok(on('Hall design', 'Ngā Hapū o Ōtaki').why.includes('Ngā'));
  assert.equal(on('Hall design', 'Ngaruawahia Community Board').on, false, 'a place that starts with Nga is not a name that starts with Ngā');
  assert.equal(on('Hall design', 'Hamilton City Council', 'Funded by Te Puni Kōkiri through Whai Kāinga Whai Oranga.').on, true);
  assert.equal(on('Hall design', 'Hamilton City Council', 'Engage with iwi and hapū early.').on, true);
  assert.equal(on('Clinic design', 'Hospital Trust Board').on, true, 'trust board is a listed buyer word: kept, and flagged for review in the sources doc');
});

test('a finding carries cultural: { on, why }, and a non-match carries on: false', () => {
  const lens = parseLens({ keywords: 'upgrade,hall' });
  const yes = scoreTender(T({ title: 'Te Atatū marae wharekai upgrade', buyer: 'Te Rūnanga o Ngāti Whātua', regions: ['Auckland'], overview: 'Refurbishment of the building.' }), lens, NOW);
  assert.equal(yes.cultural.on, true); assert.deepEqual(yes.cultural.why.slice(0, 2), ['marae', 'wharekai']);
  const no = scoreTender(T({ title: 'Hall refurbishment' }), lens, NOW);
  assert.deepEqual(no.cultural, { on: false, why: [] });
});

test('the sector chip finds cultural work by its words; without it, nothing is found for a practice that asked for something else', () => {
  const t = T({ title: 'Papakāinga design services', regions: ['Waikato'] });
  const withSector = scoreTender(t, parseLens({ sectors: 'kaupapa' }), NOW);
  assert.ok(withSector); assert.match(withSector.reasons.join('; '), /Kaupapa Māori and Indigenous work/); assert.deepEqual(withSector.matched.sectors, ['kaupapa']);
  assert.equal(scoreTender(t, parseLens({ keywords: 'library' }), NOW), null);
  assert.equal(scoreTender(T({ title: 'Hall refurbishment' }), parseLens({ sectors: 'kaupapa' }), NOW), null, 'no cultural words, no match');
});

test('"always show" keeps a cultural match that misses the practice\'s words and sectors, with a modest boost', () => {
  const t = T({ title: 'Wharekai design services', regions: ['Waikato'] });
  assert.equal(scoreTender(t, parseLens({ keywords: 'library', sectors: 'health' }), NOW), null, 'off: it misses the words');
  const on1 = scoreTender(t, parseLens({ keywords: 'library', sectors: 'health', cultural: '1' }), NOW);
  assert.ok(on1, 'on: kept'); assert.match(on1.reasons.join('; '), /kaupapa Māori or Indigenous words in the notice: “wharekai”/);
  assert.deepEqual(on1.matched, { keywords: [], sectors: [] });
  const viaKeyword = scoreTender(t, parseLens({ keywords: 'wharekai' }), NOW), viaKeywordOn = scoreTender(t, parseLens({ keywords: 'wharekai', cultural: '1' }), NOW);
  assert.equal(viaKeywordOn.fit - viaKeyword.fit, 8, 'the boost is eight points, and only when the setting is on');
  assert.equal(lensIsEmpty(parseLens({ cultural: '1' })), false, 'the setting alone is something to look for'); assert.equal(lensIsEmpty(parseLens({})), true);
  for (const v of [true, '1', 'true', 'on']) assert.equal(parseLens({ cultural: v }).cultural, true);
  for (const v of [false, '', '0', 'no', undefined, 'yes please']) assert.equal(parseLens({ cultural: v }).cultural, false);
});

test('"always show" is still about buildings and still respects the regions', () => {
  const lens = parseLens({ keywords: 'library', regions: 'Auckland', cultural: '1' });
  assert.equal(scoreTender(T({ title: 'Marae wharekai upgrade', regions: ['Otago'] }), lens, NOW), null, 'somewhere else');
  assert.ok(scoreTender(T({ title: 'Marae wharekai upgrade', regions: ['Auckland'] }), lens, NOW));
  assert.equal(scoreTender(T({ title: 'Te Puni Kōkiri licence software subscription', regions: ['Auckland'], categories: ['43230000'], buyer: 'Te Puni Kōkiri' }), lens, NOW), null, 'software is not buildings');
  assert.equal(scoreTender(T({ title: 'Provision of Māori language training for staff', buyer: 'Te Puni Kōkiri', regions: ['Auckland'], overview: 'Training courses.' }), lens, NOW), null, 'not about buildings');
  assert.equal(scoreTender(T({ title: 'Marae stormwater culvert replacement', regions: ['Auckland'] }), lens, NOW)?.fit < 45 || null, true, 'infrastructure works are marked down below the fit minimum');
  assert.equal(rankTenders([T({ title: 'Marae stormwater culvert replacement', regions: ['Auckland'] })], lens, NOW).length, 0);
  assert.ok(scoreTender(T({ title: 'Wharekura upgrade', regions: ['Auckland'] }), lens, NOW), 'a wharekura is a building even with no other building word');
});

test('the live feed passes the setting through, and with only the setting on it is not "nothing to look for"', async () => {
  const rss = (items) => `<?xml version="1.0"?><rss><channel>${items}</channel></rss>`;
  const item = (id, title, org) => `<item><title>${title}</title><link>https://www.gets.govt.nz//X/ExternalTenderDetails.htm?id=${id}</link><description>&lt;table&gt;&lt;tr&gt;&lt;td&gt;RFx ID:&lt;/td&gt;&lt;td&gt;${id}&lt;/td&gt;&lt;/tr&gt;&lt;tr&gt;&lt;td&gt;Organisation:&lt;/td&gt;&lt;td&gt;${org}&lt;/td&gt;&lt;/tr&gt;&lt;tr&gt;&lt;td&gt;Close date:&lt;/td&gt;&lt;td&gt;Monday, 7 December 2026 5:00 PM +13:00&lt;/td&gt;&lt;/tr&gt;&lt;tr&gt;&lt;td&gt;Region:&lt;/td&gt;&lt;td&gt;Auckland&lt;/td&gt;&lt;/tr&gt;&lt;tr&gt;&lt;td&gt;Overview:&lt;/td&gt;&lt;td&gt;Design services for the building.&lt;/td&gt;&lt;/tr&gt;&lt;/table&gt;</description></item>`;
  const { parseGetsRss } = await import('../../api/_feeds/hunt.js');
  const tenders = parseGetsRss(rss(item(11, 'Te Atatū marae wharekai upgrade design services', 'Ngāti Whātua Ōrākei') + item(12, 'Te Atatu library carpark resurfacing', 'Auckland Council')));
  assert.equal(tenders.length, 2);
  const lens = parseLens({ cultural: '1' });
  const ranked = rankTenders(tenders, lens, NOW);
  assert.deepEqual(ranked.map((s) => s.title), ['Te Atatū marae wharekai upgrade design services']);
  assert.equal(ranked[0].cultural.on, true);
  const reg = { gets: { id: 'gets', name: 'GETS', short: 'GETS', url: 'https://www.gets.govt.nz/ExternalIndex.htm', read: async () => ({ tenders, fetchedAt: NOW.toISOString() }) } };
  const out = await fetchHunt({ cultural: '1', sources: 'gets' }, reg);
  assert.equal(out.values.needsLens, false); assert.equal(out.values.signals.length, 1); assert.equal(out.values.lens.cultural, true);
  const none = await fetchHunt({ sources: 'gets' }, reg);
  assert.equal(none.values.needsLens, true);
});
