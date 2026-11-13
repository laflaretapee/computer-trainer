'use strict';
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const logFile = path.resolve(__dirname, 'bail_multifile_execution.log');

function logStep(step) {
  fs.appendFileSync(logFile, step + '\n', 'utf8');
}

describe('Bail Multi-File 1 Suite', () => {
  it('file 1 test 1 passes', () => {
    logStep('FILE1_TEST1_RAN');
    assert.strictEqual(1, 1);
  });

  it('file 1 test 2 fails', () => {
    logStep('FILE1_TEST2_FAIL_RAN');
    assert.strictEqual(1, 99, 'Multi-file failure in file 1');
  });
});
