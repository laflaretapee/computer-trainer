'use strict';
const assert = require('node:assert');

describe('AfterEach Hook Error Suite', () => {
  afterEach(() => {
    throw new Error('Intentional error in afterEach hook');
  });

  it('test passes but afterEach fails', () => {
    assert.strictEqual(1, 1);
  });
});
