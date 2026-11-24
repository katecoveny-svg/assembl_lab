import assert from 'node:assert/strict';
import test from 'node:test';
import { backToSource, bySlot, sourceExtra } from '../../architecture/js/site-sources-rules.js';
import { libraryOf } from '../../architecture/js/file-library-rules.js';
import { clientParts, packageEntries } from '../../architecture/js/share-rules.js';

test('a browser handoff stores a bounded camera receipt internally and never in the client view or package', () => {
  const meta = { status: 'validated', sha256: 'a'.repeat(64), secs: 4.5, start: 2, version: 3, model: 'configured-adapter' };
  const back = backToSource({ kind: 'film_proof', name: 'Pavilion-private.mp4', meta });
  assert.equal(back.slot, 'camera_proofs');
  assert.match(back.note, /no provider call/);
  const extra = sourceExtra({ ...back, version: 1 });
  assert.deepEqual(extra.source.proof, { sha256: meta.sha256, status: 'validated', secs: 4.5, start: 2, path_version: 3, model: 'configured-adapter' });
  const draft = { id: 'private', owner_kind: 'source', name: back.name, extra };
  const shared = { id: 'shared', owner_kind: 'source', name: 'Reviewed.mp4', extra: sourceExtra({ slot: 'films', version: 1 }) };
  const files = [draft, shared];
  assert.equal(bySlot(files).find((x) => x.slot.id === 'camera_proofs').stacks[0].latest.id, 'private');
  assert.equal(libraryOf({ files }).filter((x) => x.kind === 'films').length, 2);
  const client = clientParts({ project: { name: 'Pavilion' }, files });
  assert.deepEqual(client.films.map((x) => x.latest.id), ['shared']);
  assert.deepEqual(packageEntries(client).entries.map((x) => x.note.id), ['shared']);
});
test('malformed proof receipts are not persisted; failed preflight preserves only capture status', () => {
  const m = { status: 'whatever', sha256: 'b'.repeat(64), secs: 3, start: 0, version: 1, model: 'ignored' };
  const rec = { kind: 'film_proof', name: 'test.webm', meta: m };
  assert.equal(backToSource(rec).proof.status, 'capture-only'); assert.equal(backToSource(rec).proof.model, undefined);
  assert.equal(backToSource({ ...rec, meta: { ...m, secs: 9 } }), null);
  assert.equal(backToSource({ ...rec, meta: { ...m, sha256: '' } }), null);
  assert.equal(backToSource({ ...rec, name: 'look.png' }), null);
});
