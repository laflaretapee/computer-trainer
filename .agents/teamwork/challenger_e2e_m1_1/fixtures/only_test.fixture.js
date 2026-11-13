'use strict';
const assert = require('node:assert');

describe('Only Suite', () => {
  it('test without only should be skipped', () => {
    assert.strictEqual(1, 2); // Would fail if executed
  });

  it.only('test with only should run', () => {
    assert.strictEqual(1, 1);
  });
});
