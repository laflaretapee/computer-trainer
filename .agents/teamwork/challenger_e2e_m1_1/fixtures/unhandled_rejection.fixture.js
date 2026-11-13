'use strict';
const assert = require('node:assert');

describe('Unhandled Rejection Fixture Suite', () => {
  it('triggers unhandled promise rejection in background', async () => {
    // Fire an unhandled rejection
    Promise.reject(new Error('Detached unhandled rejection error'));
    // Wait briefly so Node has time to process the microtask
    await new Promise(resolve => setTimeout(resolve, 50));
    assert.strictEqual(1, 1);
  });
});
