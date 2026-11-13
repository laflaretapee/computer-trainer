'use strict';
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const logFile = path.resolve(__dirname, 'bail_nested_execution.log');

function logStep(step) {
  fs.appendFileSync(logFile, step + '\n', 'utf8');
}

describe('Bail Nested Outer Suite', () => {
  it('outer test 1 passes', () => {
    logStep('OUTER_TEST_1_RAN');
    assert.strictEqual(1, 1);
  });

  describe('Child Suite 1', () => {
    it('child 1 test 2 fails', () => {
      logStep('CHILD1_TEST_2_FAIL_RAN');
      assert.strictEqual(true, false, 'Child 1 failure');
    });

    it('child 1 test 3 (should abort)', () => {
      logStep('CHILD1_TEST_3_RAN');
      assert.strictEqual(1, 1);
    });
  });

  describe('Child Suite 2', () => {
    it('child 2 test 4 (should abort)', () => {
      logStep('CHILD2_TEST_4_RAN');
      assert.strictEqual(1, 1);
    });
  });
});
