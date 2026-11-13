'use strict';
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const logFile = path.resolve(__dirname, 'bail_execution.log');

function logStep(step) {
  fs.appendFileSync(logFile, step + '\n', 'utf8');
}

describe('Bail Fixture Suite', () => {
  it('test 1 passes', () => {
    logStep('TEST_1_RAN');
    assert.strictEqual(1, 1);
  });

  it('test 2 fails', () => {
    logStep('TEST_2_RAN');
    assert.strictEqual(1, 2, 'Intentional failure in test 2');
  });

  it('test 3 passes (should be aborted under --bail)', () => {
    logStep('TEST_3_RAN');
    assert.strictEqual(3, 3);
  });
});
