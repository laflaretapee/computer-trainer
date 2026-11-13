'use strict';
const assert = require('node:assert');

describe('Skip and Only Suite', () => {
  it('regular test', () => {
    assert.strictEqual(1, 1);
  });

  it.skip('skipped test', () => {
    assert.strictEqual(1, 2); // Would fail if executed
  });

  describe.skip('Skipped Child Suite', () => {
    it('child test in skipped suite', () => {
      assert.strictEqual(1, 2); // Would fail if executed
    });
  });
});
