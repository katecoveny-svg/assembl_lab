// The Gmail reader for GETS alerts: the generated script is in step with the parser, runs in a bare Apps Script-like sandbox (no URL, no Intl time zones,
// no modules), reads and posts exactly what it should, and never deletes, sends or forwards mail. Everything here is a stand-in: no Google, no Supabase.
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { buildScript, buildModule, parserSource, PLACEHOLDER } from '../../tools/build-gmail-reader.mjs';
import { readerScript, READER_TEMPLATE } from '../../architecture/js/gmail-reader-script.js';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '../../architecture/js/config.js';
import { parseGetsEmail } from '../../architecture/js/gets-alert.js';

const file = (f) => readFileSync(new URL(`../../${f}`, import.meta.url), 'utf8');
const L = (id) => `https://www.gets.govt.nz/EX/ExternalTenderDetails.htm?id=${id}`;
const BODY = `Kia ora,\n\n     Current Tenders\n\n     (1) Reference Number: R-1\n     Organisation:   Example Council\n     GETS RFx ID: 10000001\n     Tender Name:  Library Refurbishment Design Services\n     Closing Date: 07/12/2026 05:00PM\n     ${L('10000001')}\n\n     Future Procurement Opportunities\n     Organisation: Example Housing Agency\n     GETS RFx ID: 20000001\n     Tender Name: Papakāinga Masterplan Panel\n     Closing Date: 30/06/2027 12:00AM\n     ${L('20000001')}\n     Tender Name: Phish\n     https://www.gets.govt.nz.evil.example/X/ExternalTenderDetails.htm?id=30000001\n`;

test('Code.gs and the page\'s module are exactly what the build makes from gets-alert.js (run node tools/build-gmail-reader.mjs)', () => {
  assert.equal(file('tools/gmail-gets-reader/Code.gs'), buildScript(), 'Code.gs is out of step with architecture/js/gets-alert.js');
  assert.equal(file('architecture/js/gmail-reader-script.js'), buildModule(), 'gmail-reader-script.js is out of step');
  assert.ok(parserSource().includes('export') === false || !/^export /m.test(parserSource()), 'no module syntax in the script');
  assert.equal(readerScript(PLACEHOLDER), file('tools/gmail-gets-reader/Code.gs'), 'the page fills in the same script');
});

test('the token sits in one clearly marked const at the top, the page fills it in, and the public key and address come from config.js', () => {
  const s = readerScript('abc123');
  assert.match(s, /PRIVATE: the token below/); assert.match(s.split('\n').slice(0, 12).join('\n'), /^const ASSEMBL_TOKEN = 'abc123';$/m);
  assert.ok(s.includes(`const SUPABASE_URL = '${SUPABASE_URL}';`) && s.includes(`const SUPABASE_KEY = '${SUPABASE_PUBLISHABLE_KEY}';`));
  assert.ok(!/service_role|sb_secret|eyJ/.test(s), 'no secret key of any kind');
  assert.equal((readerScript('$&$1').match(/\$&\$1/g) ?? []).length, 1, 'a token with replacement characters is put in as it is');
  assert.ok(READER_TEMPLATE.includes('__TOKEN__'));
});

/** a sandbox like Apps Script's: no URL, no TextDecoder, no atob, no Buffer; Intl exists but is not relied on */
function sandbox({ threads, status = 200, text = '47' } = {}) {
  const log = { fetches: [], labelled: [], searched: [], logs: [], triggers: [], other: [] };
  const label = { name: 'assembl/filed' };
  const forbidden = new Proxy({}, { get: (_, k) => () => { log.other.push(String(k)); throw new Error(`forbidden: ${String(k)}`); } });
  const mkThread = (msgs) => ({ getMessages: () => msgs.map((m) => ({ getSubject: () => m.subject ?? 'GETS: Tender Subscription', getPlainBody: () => m.body, ...forbidden2(m) })), addLabel: (l) => log.labelled.push([msgs, l.name]) });
  const forbidden2 = () => ({ moveToTrash: () => { throw new Error('forbidden: moveToTrash'); }, forward: () => { throw new Error('forbidden: forward'); }, reply: () => { throw new Error('forbidden: reply'); } });
  const ctx = vm.createContext({
    Logger: { log: (m) => log.logs.push(String(m)) },
    Utilities: { formatDate: (d, tz, fmt) => { const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' }).formatToParts(d).filter((x) => x.type !== 'literal').map((x) => [x.type, x.value])); assert.equal(fmt, 'yyyy-M-d-H-m'); return `${p.year}-${p.month}-${p.day}-${p.hour}-${p.minute}`; } },
    GmailApp: { getUserLabelByName: () => label, createLabel: () => label, search: (q, a, b) => { log.searched.push([q, a, b]); return (threads ?? []).map(mkThread); }, sendEmail: () => { throw new Error('forbidden: sendEmail'); }, moveThreadsToTrash: () => { throw new Error('forbidden'); } },
    UrlFetchApp: { fetch: (url, opts) => { log.fetches.push({ url, opts }); return { getResponseCode: () => status, getContentText: () => text }; } },
    ScriptApp: { getProjectTriggers: () => [{ getHandlerFunction: () => 'run', id: 'old' }, { getHandlerFunction: () => 'other' }], deleteTrigger: (t) => log.triggers.push(['delete', t.id]), newTrigger: (fn) => ({ timeBased: () => ({ everyHours: (n) => ({ create: () => log.triggers.push(['create', fn, n]) }) }) }) },
  });
  assert.equal(vm.runInContext('typeof URL + typeof TextDecoder + typeof atob + typeof Buffer + typeof process', ctx), 'undefinedundefinedundefinedundefinedundefined');
  vm.runInContext(readerScript('t'.repeat(64)), ctx);
  return { ctx, log };
}

test('the script reads the same tenders as the page\'s parser, in a sandbox with no URL class', () => {
  const { ctx } = sandbox();
  const there = JSON.parse(vm.runInContext(`JSON.stringify(parseGetsEmail(${JSON.stringify('Subject: GETS: Tender Subscription\n\n' + BODY)}).items)`, ctx));
  const here = parseGetsEmail('Subject: GETS: Tender Subscription\n\n' + BODY).items;
  assert.deepEqual(there, here); assert.deepEqual(there.map((i) => [i.rfxId, i.kind]), [['10000001', 'current'], ['20000001', 'future']], 'the phishing block is dropped in the script too');
  assert.equal(vm.runInContext(`parseAlertDate('07/12/2026 05:00PM')`, ctx), '2026-12-07T04:00:00.000Z');
  assert.equal(vm.runInContext(`getsLink('https://www.gets.govt.nz@evil.example/A/ExternalTenderDetails.htm?id=12345678')`, ctx), null);
  assert.equal(vm.runInContext(`getsLink('https://www.gets.govt.nz:8443/A/ExternalTenderDetails.htm?id=12345678')`, ctx), null);
  assert.equal(vm.runInContext(`getsLink('http://www.gets.govt.nz/A/ExternalTenderDetails.htm?id=12345678')`, ctx), null);
  assert.equal(vm.runInContext(`getsLink('https://www.gets.govt.nz/A/ExternalTenderDetails.htm?id=12345678&x=1#f').url`, ctx), L('12345678').replace('EX', 'A'));
});

test('run(): searches as asked, posts the notices once with the right headers, labels the thread, and says what it did in one line', () => {
  const { ctx, log } = sandbox({ threads: [[{ body: BODY }], [{ body: 'Your GETS password was reset.' }]] });
  vm.runInContext('run()', ctx);
  assert.deepEqual(JSON.parse(JSON.stringify(log.searched)), [['from:noreply@gets.govt.nz subject:"GETS" newer_than:3d -label:assembl/filed', 0, 30]]);
  assert.equal(log.fetches.length, 1); const f = log.fetches[0];
  assert.equal(f.url, `${SUPABASE_URL}/rest/v1/rpc/hunt_inbox_ingest`);
  assert.equal(f.opts.method, 'post'); assert.equal(f.opts.contentType, 'application/json'); assert.deepEqual(JSON.parse(JSON.stringify(f.opts.headers)), { apikey: SUPABASE_PUBLISHABLE_KEY, 'Content-Profile': 'arch' });
  const body = JSON.parse(f.opts.payload); assert.deepEqual(Object.keys(body), ['p_token', 'p_items']); assert.equal(body.p_token, 't'.repeat(64));
  assert.deepEqual(body.p_items.map((i) => [i.rfx_id, i.kind, i.name, i.closes_at]), [['10000001', 'current', 'Library Refurbishment Design Services', '2026-12-07T04:00:00.000Z'], ['20000001', 'future', 'Papakāinga Masterplan Panel', '2027-06-29T12:00:00.000Z']]);
  assert.deepEqual(Object.keys(body.p_items[0]).sort(), ['closes_at', 'kind', 'name', 'organisation', 'ref', 'rfx_id', 'url'], 'only public notice fields leave Gmail: no sender, recipient, subject or body');
  assert.ok(!f.opts.payload.includes('Kia ora') && !f.opts.payload.includes('password'));
  assert.equal(log.labelled.length, 2, 'both threads are marked as seen, including the one with no tenders'); assert.ok(log.labelled.every(([, name]) => name === 'assembl/filed'));
  assert.deepEqual(log.logs, ['assembl: read 2 email thread(s), filed 47 notice(s).']);
});

test('a failed post labels nothing, so the next hour tries again; a bad token says what to do', () => {
  for (const status of [401, 429, 500]) {
    const { ctx, log } = sandbox({ threads: [[{ body: BODY }]], status });
    vm.runInContext('run()', ctx); assert.equal(log.labelled.length, 0); assert.match(log.logs.join(' '), new RegExp(`HTTP ${status}`));
  }
});

test('nothing new: no call at all. More than 300 notices: the rest wait for the next hour', () => {
  const none = sandbox({ threads: [] }); vm.runInContext('run()', none.ctx); assert.equal(none.log.fetches.length, 0); assert.deepEqual(none.log.logs, ['assembl: nothing new.']);
  const big = (n, base) => `Current Tenders\n${Array.from({ length: n }, (_, i) => ` Organisation: O\n GETS RFx ID: ${base + i}\n Tender Name: Hall ${base + i}\n Closing Date: 07/12/2026 05:00PM\n ${L(base + i)}`).join('\n')}`;
  const { ctx, log } = sandbox({ threads: [[{ body: big(250, 11000000) }], [{ body: big(100, 12000000) }], [{ body: big(10, 13000000) }]] });
  vm.runInContext('run()', ctx);
  assert.equal(JSON.parse(log.fetches[0].opts.payload).p_items.length, 250); assert.equal(log.labelled.length, 1, 'only the thread that was sent is labelled');
});

test('an additional-information email is sent as an update to the tender it names', () => {
  const { ctx, log } = sandbox({ threads: [[{ subject: 'GETS: Additional Information for GETS Notice', body: `A notice has been updated.\n GETS RFx ID: 10000001\n Tender Name: Library Refurbishment Design Services\n Closing Date: 21/12/2026 05:00PM\n ${L('10000001')}` }]] });
  vm.runInContext('run()', ctx);
  assert.deepEqual(JSON.parse(log.fetches[0].opts.payload).p_items.map((i) => [i.rfx_id, i.kind, i.closes_at]), [['10000001', 'current', '2026-12-21T04:00:00.000Z']]);
});

test('setup() replaces its own hourly trigger and leaves other triggers alone; the script never deletes, sends, forwards, replies or moves mail', () => {
  const { ctx, log } = sandbox({ threads: [] });
  vm.runInContext('setup()', ctx);
  assert.deepEqual(log.triggers, [['delete', 'old'], ['create', 'run', 1]]);
  const s = readerScript('x');
  const code = s.replace(/^\s*\/\/.*$/gm, ''); // the header says what it never does; the code must not do it
  for (const bad of ['sendEmail', '.forward(', '.reply(', '.replyAll(', 'moveToTrash', 'moveThread', 'markRead', 'deleteLabel', 'createDraft', 'GmailApp.getInbox', 'MailApp', 'DriveApp', 'SpreadsheetApp', 'eval(', 'new Function(', 'getRawContent', 'getAttachments', 'getFrom', 'getTo(', 'getCc', 'getBcc']) assert.ok(!code.includes(bad), `the script must not use ${bad}`);
  assert.deepEqual([...new Set(s.match(/\b(?:GmailApp|UrlFetchApp|ScriptApp)\.\w+/g))].sort(), ['GmailApp.createLabel', 'GmailApp.getUserLabelByName', 'GmailApp.search', 'ScriptApp.deleteTrigger', 'ScriptApp.getProjectTriggers', 'ScriptApp.newTrigger', 'UrlFetchApp.fetch'].sort().filter((x) => s.includes(x)));
  assert.equal((s.match(/UrlFetchApp\.fetch\(/g) ?? []).length, 1, 'one place talks to the network, and only to the workspace\'s own address');
});
