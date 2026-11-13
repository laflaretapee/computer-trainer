'use strict';
const assert = require('node:assert');

describe('Fast Async Fixture Suite', () => {
  it('resolves cleanly after 50ms', async () => {
    await new Promise(resolve => setTimeout(resolve, 50));
    assert.strictEqual(true, true);
  });
});
