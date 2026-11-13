'use strict';
const fs = require('node:fs');
const path = require('node:path');

const logFile = path.resolve(__dirname, 'hook_execution.log');

function logStep(step) {
  fs.appendFileSync(logFile, step + '\n', 'utf8');
}

describe('Hook Error Fixture Suite', () => {
  beforeEach(() => {
    logStep('BEFORE_EACH_RAN');
    throw new Error('Intentional error in beforeEach hook');
  });

  afterEach(() => {
    logStep('AFTER_EACH_RAN');
  });

  it('test body should be skipped when beforeEach throws', () => {
    logStep('TEST_BODY_RAN');
  });
});
