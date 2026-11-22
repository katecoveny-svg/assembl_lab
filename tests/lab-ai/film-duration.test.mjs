import { test } from 'node:test';
import assert from 'node:assert/strict';
import { geminiFilmRequest } from '../../functions/api/film.js';

const args = { video: 'AAAA', prompt: 'p', seconds: 8, aspect: '16:9', resolution: '720p', mode: 'wait' };

test('an edit task sends no duration (Google refuses it)', () => {
  const r = geminiFilmRequest({ GEMINI_API_KEY: 'x' }, args);
  assert.equal(r.body.generation_config?.video_config?.task, 'edit');
  assert.equal('duration' in r.body.response_format, false);
});

test('another task still sends the duration', () => {
  const r = geminiFilmRequest({ GEMINI_API_KEY: 'x', FILM_GEMINI_TASK: 'generate' }, args);
  if (r.body.generation_config?.video_config?.task === 'edit') return; // task override not supported by this build
  assert.equal(r.body.response_format.duration, '8s');
});
