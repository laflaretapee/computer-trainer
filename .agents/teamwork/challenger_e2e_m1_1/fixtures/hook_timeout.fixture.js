'use strict';
const fs = require('node:fs');
const path = require('node:path');

const logFile = path.resolve(__dirname, 'hook_timeout_execution.log');

function logStep(step) {
  fs.appendFileSync(logFile, step + '\n', 'utf8');
}

describe('Hook Timeout Fixture Suite', () => {
  beforeEach(() => {
    logStep('BEFORE_EACH_HANG_START');
    return new Promise(() => {
      // hangs forever
    });
  });

  afterEach(() => {
    logStep('AFTER_EACH_CLEANUP_RAN');
  });

  it('test should never run', () => {
    logStep('TEST_BODY_SHOULD_NOT_RUN');
  });
});
