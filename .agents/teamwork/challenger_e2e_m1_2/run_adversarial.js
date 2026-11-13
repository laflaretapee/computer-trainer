/**
 * run_adversarial.js
 * Master runner for all Challenger 2 adversarial stress suites
 * Authored by Challenger 2 (E2E-M1)
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const assertSuite = require('./tests_adversarial_assert.js');
const domSuite = require('./tests_adversarial_dom.js');
const leakSuite = require('./tests_adversarial_leak.js');

async function main() {
  console.log('================================================================');
  console.log('CHALLENGER 2: ADVERSARIAL STRESS SUITE (MILESTONE E2E-M1)');
  console.log('Targeting: tests/helpers/assert.js and tests/helpers/dom_env.js');
  console.log('================================================================\n');

  const assertRes = await assertSuite.runAll();
  const domRes = await domSuite.runAll();
  const leakRes = await leakSuite.runAll();

  const totalPassed = assertRes.passed + domRes.passed + leakRes.passed;
  const totalFailed = assertRes.failed + domRes.failed + leakRes.failed;
  const totalCount = assertRes.total + domRes.total + leakRes.total;

  console.log('================================================================');
  console.log(`TOTAL ADVERSARIAL TESTS: ${totalCount}`);
  console.log(`PASSED: ${totalPassed}`);
  console.log(`FAILED: ${totalFailed}`);
  console.log('================================================================\n');

  const summary = {
    timestamp: new Date().toISOString(),
    total: totalCount,
    passed: totalPassed,
    failed: totalFailed,
    suites: {
      assert: assertRes,
      dom: domRes,
      leak: leakRes,
    }
  };

  fs.writeFileSync(
    path.join(__dirname, 'execution.log'),
    JSON.stringify(summary, null, 2),
    'utf8'
  );

  console.log(`Saved execution log to: ${path.join(__dirname, 'execution.log')}`);
}

main().catch(err => {
  console.error('Master runner fatal error:', err);
  process.exit(1);
});
