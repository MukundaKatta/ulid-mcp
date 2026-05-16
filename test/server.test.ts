import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import { generate, decode } from '../src/server.js';

test('generate produces a 26-char string', () => {
  const u = generate();
  assert.equal(u.length, 26);
  // Crockford base32 alphabet only.
  assert.match(u, /^[0-9A-HJKMNP-TV-Z]+$/);
});

test('decode recovers the timestamp', () => {
  const now = 1700000000_000;
  const u = generate(now);
  const d = decode(u);
  assert.equal(d.timestamp_ms, now);
  assert.equal(d.iso, '2023-11-14T22:13:20.000Z');
});

test('ULIDs sort lexicographically by time', () => {
  const a = generate(1_700_000_000_000);
  const b = generate(1_700_000_001_000);
  const c = generate(1_700_000_002_000);
  const sorted = [c, a, b].sort();
  assert.deepEqual(sorted, [a, b, c]);
});

test('many ULIDs in a tight loop are unique', () => {
  const set = new Set();
  for (let i = 0; i < 1000; i++) set.add(generate());
  assert.equal(set.size, 1000);
});

test('rejects malformed ULID', () => {
  assert.throws(() => decode('short'));
  assert.throws(() => decode('XXXXXXXXXXXXXXXXXXXXXXXXIL')); // I and L not valid
});

test('rejects out-of-range timestamp', () => {
  assert.throws(() => generate(-1));
  assert.throws(() => generate(2 ** 60));
});
