'use strict';

describe('Timeout Fixture Suite', () => {
  it('hangs indefinitely by returning pending promise', () => {
    return new Promise(() => {
      // Intentionally never resolves or rejects
    });
  });
});
