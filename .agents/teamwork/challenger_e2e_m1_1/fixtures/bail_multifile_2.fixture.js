'use strict';
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const logFile = path.resolve(__dirname, 'bail_multifile_execution.log');

function logStep(step) {
  fs.appendFileSync(logFile, step + '\n', 'utf8');
}

describe('Bail Multi-File 2 Suite', () => {
  it('file 2 test 1 should never run when file 1 failed with bail', () => {
    logStep('FILE2_TEST1_RAN');
    assert.strictEqual(1, 1);
  });
});
