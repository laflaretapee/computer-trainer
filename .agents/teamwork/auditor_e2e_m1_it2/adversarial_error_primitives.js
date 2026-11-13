'use strict';
/**
 * adversarial_error_primitives.js
 * Verify runner handles throw null, throw string, throw number, reject primitive with exit code 1
 */

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const fixtures = [
  { name: 'throw_null', code: `test('throws null', () => { throw null; });` },
  { name: 'throw_undef', code: `test('throws undefined', () => { throw undefined; });` },
  { name: 'throw_str', code: `test('throws string', () => { throw 'fatal boom'; });` },
  { name: 'throw_num', code: `test('throws number', () => { throw 503; });` },
  { name: 'reject_str', code: `test('rejects string', async () => { return Promise.reject('async failure'); });` },
];

let allPassed = true;

for (const fix of fixtures) {
  const filePath = path.resolve(__dirname, `temp_${fix.name}.test.js`);
  fs.writeFileSync(filePath, `describe('Primitive Error Suite', () => { ${fix.code} });`);

  try {
    const res = spawnSync(process.execPath, ['tests/runner.js', filePath], {
      cwd: path.resolve(__dirname, '../../../'),
      encoding: 'utf8',
    });

    const passed = (res.status === 1) && res.stdout.includes('FAILURES SUMMARY');
    if (!passed) {
      allPassed = false;
      console.error(`[FAIL] ${fix.name}: expected exit 1 & summary, got code=${res.status}`);
      console.error(res.stdout);
      console.error(res.stderr);
    } else {
      console.log(`[PASS] ${fix.name}: correctly captured, exit code 1`);
    }
  } finally {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
}

if (!allPassed) {
  process.exit(1);
} else {
  console.log('ALL PRIMITIVE ERROR STRESS TESTS PASSED!');
}
