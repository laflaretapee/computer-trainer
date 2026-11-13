'use strict';

const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');
const RUNNER_PATH = process.env.TEST_RUNNER_PATH ? path.resolve(PROJECT_ROOT, process.env.TEST_RUNNER_PATH) : path.join(PROJECT_ROOT, 'tests', 'runner.js');
const FIXTURES_DIR = path.join(__dirname, 'fixtures');
const LOG_FILE = path.join(__dirname, 'stress_test.log');

// Clear log file
fs.writeFileSync(LOG_FILE, `=== ADVERSARIAL STRESS TEST LOG ===\nStarted: ${new Date().toISOString()}\n\n`, 'utf8');

function log(msg) {
  console.log(msg);
  fs.appendFileSync(LOG_FILE, msg + '\n', 'utf8');
}

function runCommand(args, options = {}) {
  return new Promise((resolve) => {
    const start = Date.now();
    const child = spawn(process.execPath, [RUNNER_PATH, ...args], {
      cwd: PROJECT_ROOT,
      env: { ...process.env, NO_COLOR: '1' },
      ...options,
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', (d) => { stderr += d.toString(); });

    child.on('close', (code, signal) => {
      const duration = Date.now() - start;
      resolve({
        code: code ?? (signal ? -1 : 0),
        signal,
        stdout,
        stderr,
        duration,
        combined: stdout + '\n' + stderr,
      });
    });

    child.on('error', (err) => {
      const duration = Date.now() - start;
      resolve({
        code: -1,
        signal: null,
        stdout,
        stderr: stderr + '\n' + err.message,
        duration,
        combined: stdout + '\n' + stderr + '\n' + err.message,
      });
    });
  });
}

function cleanSentinelLogs() {
  const logFiles = [
    path.join(FIXTURES_DIR, 'bail_execution.log'),
    path.join(FIXTURES_DIR, 'bail_nested_execution.log'),
    path.join(FIXTURES_DIR, 'bail_multifile_execution.log'),
    path.join(FIXTURES_DIR, 'hook_execution.log'),
    path.join(FIXTURES_DIR, 'hook_timeout_execution.log'),
  ];
  for (const f of logFiles) {
    if (fs.existsSync(f)) {
      try { fs.unlinkSync(f); } catch {}
    }
  }
}

const testResults = [];

function recordTest(suiteName, testName, passed, details = '') {
  testResults.push({ suiteName, testName, passed, details });
  const mark = passed ? '✔ PASS' : '✖ FAIL';
  log(`  [${mark}] ${suiteName} > ${testName} ${details ? '(' + details + ')' : ''}`);
}

async function runAllStressTests() {
  log(`\n================================================================`);
  log(`Adversarial Stress Test Suite: tests/runner.js`);
  log(`Project Root: ${PROJECT_ROOT}`);
  log(`Runner Path:  ${RUNNER_PATH}`);
  log(`Date:         ${new Date().toISOString()}`);
  log(`================================================================\n`);

  // ──────────────────────────────────────────────────────────────────────────
  // SUITE 1: CLI Flags & Options Robustness
  // ──────────────────────────────────────────────────────────────────────────
  log(`--- SUITE 1: CLI Flags & Options Robustness ---`);

  // 1.1 Invalid tier: --tier 99
  {
    const res = await runCommand(['--tier', '99']);
    const pass = res.code === 1 && res.combined.includes('Invalid tier "99"');
    recordTest('Suite 1: CLI Flags', 'Invalid tier --tier 99 exits 1 with error message', pass, `code=${res.code}`);
  }

  // 1.2 Invalid tier: --tier invalidTier
  {
    const res = await runCommand(['--tier', 'invalidTier']);
    const pass = res.code === 1 && res.combined.includes('Invalid tier "invalidTier"');
    recordTest('Suite 1: CLI Flags', 'Invalid tier string exits 1', pass, `code=${res.code}`);
  }

  // 1.3 Missing value for --tier at end of arguments
  {
    const res = await runCommand(['--tier']);
    const pass = res.code === 1;
    recordTest('Suite 1: CLI Flags', 'Dangling --tier flag exits 1', pass, `code=${res.code}`);
  }

  // 1.4 Non-existent test file path
  {
    const res = await runCommand(['does_not_exist.test.js']);
    const pass = res.code === 1 && res.combined.includes('Test file not found');
    recordTest('Suite 1: CLI Flags', 'Non-existent test file exits 1', pass, `code=${res.code}`);
  }

  // 1.5 Valid tier: --tier infra
  {
    const res = await runCommand(['--tier', 'infra']);
    const pass = res.code === 0 && res.combined.includes('ALL TESTS PASSED');
    recordTest('Suite 1: CLI Flags', 'Valid --tier infra discovers and passes', pass, `code=${res.code}, dur=${res.duration}ms`);
  }

  // 1.6 Valid tier: --tier all
  {
    const res = await runCommand(['--tier', 'all']);
    const pass = res.code === 0 && res.combined.includes('ALL TESTS PASSED');
    recordTest('Suite 1: CLI Flags', 'Valid --tier all executes and passes', pass, `code=${res.code}`);
  }

  // 1.7 Currently empty tier: --tier 1
  {
    const res = await runCommand(['--tier', '1']);
    const pass = res.code === 1 && res.combined.includes('No test files found matching tier: 1');
    recordTest('Suite 1: CLI Flags', 'Empty tier 1 exits 1 with descriptive error', pass, `code=${res.code}`);
  }

  // 1.8 Malformed regex in --filter
  {
    const res = await runCommand(['--filter', '[a-']);
    const pass = res.code === 1 && res.combined.includes('Invalid regular expression pattern');
    recordTest('Suite 1: CLI Flags', 'Malformed regex in --filter exits 1', pass, `code=${res.code}`);
  }

  // 1.9 Filter matching zero tests: -f zzz_no_match
  {
    const res = await runCommand(['tests/test_infra.test.js', '-f', 'zzz_no_match']);
    // Runner filters all tests; total tests executed: 0; no failures -> code 0
    const pass = res.code === 0 && res.combined.includes('TOTALS') && !res.combined.includes('✖');
    recordTest('Suite 1: CLI Flags', 'Filter matching 0 tests handles cleanly', pass, `code=${res.code}`);
  }

  // 1.10 Filter matching specific test
  {
    const res = await runCommand(['tests/test_infra.test.js', '-f', 'homoglyph']);
    const pass = res.code === 0 && res.combined.includes('homoglyph') && res.combined.includes('1 passed');
    recordTest('Suite 1: CLI Flags', 'Filter matching specific test executes only matched test', pass, `code=${res.code}`);
  }

  // 1.11 Help screens: --help and -h
  {
    const resLong = await runCommand(['--help']);
    const resShort = await runCommand(['-h']);
    const pass = resLong.code === 0 && resShort.code === 0 && resLong.combined.includes('USAGE:') && resShort.combined.includes('USAGE:');
    recordTest('Suite 1: CLI Flags', '--help and -h display menu and exit 0', pass, `longCode=${resLong.code}, shortCode=${resShort.code}`);
  }

  // 1.12 Verbose flag: -v
  {
    const res = await runCommand(['tests/test_infra.test.js', '-v']);
    const pass = res.code === 0 && res.combined.includes('ALL TESTS PASSED');
    recordTest('Suite 1: CLI Flags', 'Verbose flag -v runs cleanly and exits 0', pass, `code=${res.code}`);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // SUITE 2: Bail Flag Behavior (--bail / -b)
  // ──────────────────────────────────────────────────────────────────────────
  log(`\n--- SUITE 2: Bail Flag Behavior ---`);

  const bailFixture = path.relative(PROJECT_ROOT, path.join(FIXTURES_DIR, 'bail.fixture.js'));
  const bailLogFile = path.join(FIXTURES_DIR, 'bail_execution.log');

  // 2.1 Without --bail: all 3 tests must run (Test 1, Test 2 fail, Test 3 pass)
  {
    cleanSentinelLogs();
    const res = await runCommand([bailFixture]);
    const sentinelContent = fs.existsSync(bailLogFile) ? fs.readFileSync(bailLogFile, 'utf8') : '';
    const pass = res.code === 1 &&
                 sentinelContent.includes('TEST_1_RAN') &&
                 sentinelContent.includes('TEST_2_RAN') &&
                 sentinelContent.includes('TEST_3_RAN');
    recordTest('Suite 2: Bail Flag', 'Without --bail: all tests run including post-failure tests', pass, `code=${res.code}`);
  }

  // 2.2 With --bail: Test 1 runs, Test 2 fails, Test 3 MUST NOT run!
  {
    cleanSentinelLogs();
    const res = await runCommand(['--bail', bailFixture]);
    const sentinelContent = fs.existsSync(bailLogFile) ? fs.readFileSync(bailLogFile, 'utf8') : '';
    const pass = res.code === 1 &&
                 sentinelContent.includes('TEST_1_RAN') &&
                 sentinelContent.includes('TEST_2_RAN') &&
                 !sentinelContent.includes('TEST_3_RAN');
    recordTest('Suite 2: Bail Flag', 'With --bail: execution aborts immediately after failure (Test 3 never runs)', pass, `code=${res.code}`);
  }

  // 2.3 With short -b flag
  {
    cleanSentinelLogs();
    const res = await runCommand(['-b', bailFixture]);
    const sentinelContent = fs.existsSync(bailLogFile) ? fs.readFileSync(bailLogFile, 'utf8') : '';
    const pass = res.code === 1 &&
                 sentinelContent.includes('TEST_1_RAN') &&
                 sentinelContent.includes('TEST_2_RAN') &&
                 !sentinelContent.includes('TEST_3_RAN');
    recordTest('Suite 2: Bail Flag', 'With short -b flag: execution aborts immediately after failure', pass, `code=${res.code}`);
  }

  // 2.4 Nested suite bail behavior
  {
    cleanSentinelLogs();
    const nestedFixture = path.relative(PROJECT_ROOT, path.join(FIXTURES_DIR, 'bail_nested.fixture.js'));
    const nestedLogFile = path.join(FIXTURES_DIR, 'bail_nested_execution.log');
    const res = await runCommand(['--bail', nestedFixture]);
    const sentinelContent = fs.existsSync(nestedLogFile) ? fs.readFileSync(nestedLogFile, 'utf8') : '';
    const pass = res.code === 1 &&
                 sentinelContent.includes('OUTER_TEST_1_RAN') &&
                 sentinelContent.includes('CHILD1_TEST_2_FAIL_RAN') &&
                 !sentinelContent.includes('CHILD1_TEST_3_RAN') &&
                 !sentinelContent.includes('CHILD2_TEST_4_RAN');
    recordTest('Suite 2: Bail Flag', 'Nested suite bail: aborts remaining sibling tests and child suites', pass, `code=${res.code}`);
  }

  // 2.5 Multi-file bail behavior
  {
    cleanSentinelLogs();
    const file1 = path.relative(PROJECT_ROOT, path.join(FIXTURES_DIR, 'bail_multifile_1.fixture.js'));
    const file2 = path.relative(PROJECT_ROOT, path.join(FIXTURES_DIR, 'bail_multifile_2.fixture.js'));
    const multiLogFile = path.join(FIXTURES_DIR, 'bail_multifile_execution.log');
    const res = await runCommand(['--bail', file1, file2]);
    const sentinelContent = fs.existsSync(multiLogFile) ? fs.readFileSync(multiLogFile, 'utf8') : '';
    const pass = res.code === 1 &&
                 sentinelContent.includes('FILE1_TEST1_RAN') &&
                 sentinelContent.includes('FILE1_TEST2_FAIL_RAN') &&
                 !sentinelContent.includes('FILE2_TEST1_RAN');
    recordTest('Suite 2: Bail Flag', 'Multi-file bail: subsequent test files are skipped entirely', pass, `code=${res.code}`);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // SUITE 3: Timeout Behavior & Hang Resistance
  // ──────────────────────────────────────────────────────────────────────────
  log(`\n--- SUITE 3: Timeout Behavior & Hang Resistance ---`);

  const timeoutAsyncFixture = path.relative(PROJECT_ROOT, path.join(FIXTURES_DIR, 'timeout_async.fixture.js'));
  const timeoutPassFixture = path.relative(PROJECT_ROOT, path.join(FIXTURES_DIR, 'timeout_pass.fixture.js'));

  // 3.1 Async test hangs indefinitely with --timeout 300
  {
    const res = await runCommand(['--timeout', '300', timeoutAsyncFixture]);
    const pass = res.code === 1 &&
                 res.combined.includes('Test timed out after 300ms') &&
                 res.duration >= 250 &&
                 res.duration < 3000; // Did NOT hang indefinitely
    recordTest('Suite 3: Timeout', 'Async hanging test aborts at configured timeout (300ms) and does not hang', pass, `code=${res.code}, dur=${res.duration}ms`);
  }

  // 3.2 Async test with --timeout=250 syntax
  {
    const res = await runCommand(['--timeout=250', timeoutAsyncFixture]);
    const pass = res.code === 1 &&
                 res.combined.includes('Test timed out after 250ms') &&
                 res.duration >= 200 &&
                 res.duration < 3000;
    recordTest('Suite 3: Timeout', '--timeout=250 inline syntax properly respected', pass, `code=${res.code}, dur=${res.duration}ms`);
  }

  // 3.3 Fast async test finishes well before timeout
  {
    const res = await runCommand(['--timeout', '1000', timeoutPassFixture]);
    const pass = res.code === 0 && res.combined.includes('ALL TESTS PASSED');
    recordTest('Suite 3: Timeout', 'Fast async test succeeds cleanly within timeout', pass, `code=${res.code}, dur=${res.duration}ms`);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // SUITE 4: Asynchronous Error Handling & Lifecycle Cleanup
  // ──────────────────────────────────────────────────────────────────────────
  log(`\n--- SUITE 4: Async Error Handling & Lifecycle Cleanup ---`);

  // 4.1 Throwing in beforeEach hook
  {
    cleanSentinelLogs();
    const hookErrorFixture = path.relative(PROJECT_ROOT, path.join(FIXTURES_DIR, 'hook_error.fixture.js'));
    const hookLogFile = path.join(FIXTURES_DIR, 'hook_execution.log');
    const res = await runCommand([hookErrorFixture]);
    const sentinelContent = fs.existsSync(hookLogFile) ? fs.readFileSync(hookLogFile, 'utf8') : '';
    const pass = res.code === 1 &&
                 sentinelContent.includes('BEFORE_EACH_RAN') &&
                 !sentinelContent.includes('TEST_BODY_RAN') &&
                 sentinelContent.includes('AFTER_EACH_RAN');
    recordTest('Suite 4: Async Errors', 'beforeEach throw aborts test body and executes afterEach cleanup', pass, `code=${res.code}`);
  }

  // 4.2 Timeout in beforeEach hook
  {
    cleanSentinelLogs();
    const hookTimeoutFixture = path.relative(PROJECT_ROOT, path.join(FIXTURES_DIR, 'hook_timeout.fixture.js'));
    const hookTimeoutLogFile = path.join(FIXTURES_DIR, 'hook_timeout_execution.log');
    const res = await runCommand(['--timeout', '250', hookTimeoutFixture]);
    const sentinelContent = fs.existsSync(hookTimeoutLogFile) ? fs.readFileSync(hookTimeoutLogFile, 'utf8') : '';
    const pass = res.code === 1 &&
                 sentinelContent.includes('BEFORE_EACH_HANG_START') &&
                 !sentinelContent.includes('TEST_BODY_SHOULD_NOT_RUN') &&
                 sentinelContent.includes('AFTER_EACH_CLEANUP_RAN') &&
                 res.duration < 3000;
    recordTest('Suite 4: Async Errors', 'beforeEach timeout aborts test body and executes afterEach cleanup', pass, `code=${res.code}, dur=${res.duration}ms`);
  }

  // 4.3 Error in afterEach hook
  {
    const afterEachFixture = path.relative(PROJECT_ROOT, path.join(FIXTURES_DIR, 'hook_aftereach_error.fixture.js'));
    const res = await runCommand([afterEachFixture]);
    const pass = res.combined.includes('Error in afterEach hook') && res.code === 0; // Test itself passed, hook caught & logged
    recordTest('Suite 4: Async Errors', 'Error in afterEach hook logged without crashing runner', pass, `code=${res.code}`);
  }

  // 4.4 Syntax error in test file
  {
    const syntaxFixture = path.relative(PROJECT_ROOT, path.join(FIXTURES_DIR, 'syntax_error.fixture.js'));
    const res = await runCommand([syntaxFixture]);
    const pass = res.code === 1 && res.combined.includes('Failed to load test file');
    recordTest('Suite 4: Async Errors', 'Syntax error in test file captured cleanly with exit code 1', pass, `code=${res.code}`);
  }

  // 4.5 Unhandled Promise Rejection
  {
    const unhandledFixture = path.relative(PROJECT_ROOT, path.join(FIXTURES_DIR, 'unhandled_rejection.fixture.js'));
    const res = await runCommand([unhandledFixture]);
    // In Node 22, unhandled rejection triggers unhandledRejection event. If not caught, Node exits 1.
    const pass = res.code === 1 || res.combined.includes('UnhandledPromiseRejection');
    recordTest('Suite 4: Async Errors', 'Unhandled Promise rejection causes failure or warning', pass, `code=${res.code}`);
  }

  // 4.6 Throwing null / non-Error in test
  {
    const nullFixture = path.relative(PROJECT_ROOT, path.join(FIXTURES_DIR, 'throw_null.fixture.js'));
    const res = await runCommand([nullFixture]);
    // If reporter crashes, it prints "TypeError: Cannot read properties of null"
    const pass = res.code === 1 && !res.combined.includes('TypeError: Cannot read properties of null');
    recordTest('Suite 4: Async Errors', 'Throwing null formats cleanly without crashing reporter', pass, `code=${res.code}, crashedReporter=${res.combined.includes('Cannot read properties of null')}`);
  }

  // 4.7 Throwing raw string in test
  {
    const stringFixture = path.relative(PROJECT_ROOT, path.join(FIXTURES_DIR, 'throw_string.fixture.js'));
    const res = await runCommand([stringFixture]);
    const pass = res.code === 1 && res.combined.includes('something broke');
    recordTest('Suite 4: Async Errors', 'Throwing string preserves error message string in reporter', pass, `code=${res.code}, messagePreserved=${res.combined.includes('something broke')}`);
  }

  // 4.8 Completely empty test file
  {
    const emptyFixture = path.relative(PROJECT_ROOT, path.join(FIXTURES_DIR, 'empty.fixture.js'));
    const res = await runCommand([emptyFixture]);
    const pass = res.code === 0 && res.combined.includes('ALL TESTS PASSED');
    recordTest('Suite 4: Async Errors', 'Completely empty test file executes safely with code 0', pass, `code=${res.code}`);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // SUITE 5: Concurrency & Exit Code Determinism
  // ──────────────────────────────────────────────────────────────────────────
  log(`\n--- SUITE 5: Concurrency & Deterministic Exit Codes ---`);

  // 5.1 Run 10 parallel runner instances on passing test suite
  {
    const PARALLEL_COUNT = 10;
    const promises = [];
    for (let i = 0; i < PARALLEL_COUNT; i++) {
      promises.push(runCommand(['tests/test_infra.test.js']));
    }
    const results = await Promise.all(promises);
    const allPassed = results.every(r => r.code === 0 && r.combined.includes('ALL TESTS PASSED'));
    const allDurations = results.map(r => r.duration);
    const avgDuration = Math.round(allDurations.reduce((a, b) => a + b, 0) / PARALLEL_COUNT);
    recordTest('Suite 5: Concurrency', `10 parallel runner instances on passing suite all exit 0 deterministically`, allPassed, `avg=${avgDuration}ms, allCode0=${allPassed}`);
  }

  // 5.2 Run 10 parallel runner instances on failing fixture
  {
    const PARALLEL_COUNT = 10;
    const promises = [];
    for (let i = 0; i < PARALLEL_COUNT; i++) {
      promises.push(runCommand([bailFixture]));
    }
    const results = await Promise.all(promises);
    const allFailed = results.every(r => r.code === 1 && r.combined.includes('TEST SUITE FAILED'));
    recordTest('Suite 5: Concurrency', `10 parallel runner instances on failing fixture all exit 1 deterministically`, allFailed, `allCode1=${allFailed}`);
  }

  // 5.3 Sequential repetition (5 runs) checking exit code consistency
  {
    const REPEAT = 5;
    let allZero = true;
    for (let i = 0; i < REPEAT; i++) {
      const res = await runCommand(['tests/test_infra.test.js']);
      if (res.code !== 0) {
        allZero = false;
        break;
      }
    }
    recordTest('Suite 5: Determinism', `5 repeated sequential executions consistently yield exit code 0`, allZero, `repeats=${REPEAT}`);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // SUMMARY
  // ──────────────────────────────────────────────────────────────────────────
  const totalTests = testResults.length;
  const passedTests = testResults.filter(t => t.passed).length;
  const failedTests = totalTests - passedTests;

  log(`\n================================================================`);
  log(`ADVERSARIAL STRESS TEST SUMMARY`);
  log(`Total Scenarios:  ${totalTests}`);
  log(`Passed:           ${passedTests}`);
  log(`Failed:           ${failedTests}`);
  log(`Overall Result:   ${failedTests === 0 ? 'ALL PASSED (VERIFIED)' : 'FAILURES DETECTED'}`);
  log(`================================================================\n`);

  cleanSentinelLogs();

  return {
    total: totalTests,
    passed: passedTests,
    failed: failedTests,
    results: testResults,
  };
}

if (require.main === module) {
  runAllStressTests().then(summary => {
    process.exit(summary.failed === 0 ? 0 : 1);
  }).catch(err => {
    console.error('Stress test harness failure:', err);
    process.exit(1);
  });
}

module.exports = { runAllStressTests };
