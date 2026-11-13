'use strict';
const assert = require('node:assert');

describe('Passing Fixture Suite', () => {
  it('passes simple equality', () => {
    assert.strictEqual(1 + 1, 2);
  });

  it('passes string transformation', () => {
    assert.strictEqual('hello'.toUpperCase(), 'HELLO');
  });
});
