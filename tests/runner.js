#!/usr/bin/env node
/**
 * tests/runner.js
 * Master Test Runner for 7th-Grade Computer Trainer SPA.
 * Production-grade, zero-external-npm-dependency test runner supporting Tiers 1-5,
 * CLI filtering, BDD lifecycle hooks, colored reporting, ASCII tier table, and strict exit codes.
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const process = require('node:process');

// ─── 1. ANSI Colors & Formatting ─────────────────────────────────────────────

const useColor = !process.env.NO_COLOR && (Boolean(process.stdout.isTTY) || Boolean(process.env.TERM));

const c = {
  reset:   useColor ? '\x1b[0m'  : '',
  bold:    useColor ? '\x1b[1m'  : '',
  dim:     useColor ? '\x1b[2m'  : '',
  green:   useColor ? '\x1b[32m' : '',
  red:     useColor ? '\x1b[31m' : '',
  yellow:  useColor ? '\x1b[33m' : '',
  blue:    useColor ? '\x1b[34m' : '',
  magenta: useColor ? '\x1b[35m' : '',
  cyan:    useColor ? '\x1b[36m' : '',
  white:   useColor ? '\x1b[37m' : '',
  gray:    useColor ? '\x1b[90m' : '',
};

// ─── 2. CLI Argument Parser ──────────────────────────────────────────────────

function printHelp() {
  console.log(`
${c.bold}7th-Grade Computer Trainer — Master Test Runner${c.reset}

${c.bold}USAGE:${c.reset}
  node tests/runner.js [options] [test-files...]

${c.bold}OPTIONS:${c.reset}
  -t, --tier <tier>       Filter tests by tier: 1, 2, 3, 4, 5, infra, all (default: all)
  -f, --filter <pattern>  Regex or string pattern to filter suites and tests
  -v, --verbose           Print detailed assertion and execution traces
  -b, --bail              Immediately stop execution upon first test failure
  --timeout <ms>          Execution timeout per test in milliseconds (default: 5000)
  -h, --help              Display this help menu and exit with code 0

${c.bold}TIER STRUCTURE:${c.reset}
  infra                   Standalone & infrastructure tests (tests/*.test.js)
  1                       Tier 1: Feature isolation (tests/tier1_features/)
  2                       Tier 2: Boundary value analysis (tests/tier2_boundaries/)
  3                       Tier 3: Pairwise combinations (tests/tier3_pairwise/)
  4                       Tier 4: Real-world application scenarios (tests/tier4_scenarios/)
  5                       Tier 5: Adversarial stress & hardening (tests/tier5_adversarial/)
  all                     All available tiers (default)

${c.bold}EXAMPLES:${c.reset}
  node tests/runner.js --help
  node tests/runner.js tests/test_infra.test.js
  node tests/runner.js --tier infra
  node tests/runner.js --tier 1 --verbose
  node tests/runner.js -f "keyboard"
`);
}

function parseArgs(argv) {
  const options = {
    tier: 'all',
    filter: null,
    verbose: false,
    bail: false,
    timeout: 5000,
    help: false,
    files: [],
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === '-h' || arg === '--help') {
      options.help = true;
    } else if (arg === '-v' || arg === '--verbose') {
      options.verbose = true;
    } else if (arg === '-b' || arg === '--bail') {
      options.bail = true;
    } else if (arg === '-t' || arg === '--tier') {
      options.tier = argv[++i];
    } else if (arg.startsWith('--tier=')) {
      options.tier = arg.split('=')[1];
    } else if (arg === '-f' || arg === '--filter') {
      options.filter = argv[++i];
    } else if (arg.startsWith('--filter=')) {
      options.filter = arg.split('=')[1];
    } else if (arg.startsWith('--timeout=')) {
      options.timeout = parseInt(arg.split('=')[1], 10);
    } else if (arg === '--timeout') {
      options.timeout = parseInt(argv[++i], 10);
    } else if (!arg.startsWith('-')) {
      options.files.push(arg);
    }
  }

  return options;
}

// ─── 3. Test Discovery ───────────────────────────────────────────────────────

const TIERS_CONFIG = [
  { id: 'infra', name: 'Standalone / Infra', dir: '' },
  { id: '1',     name: 'Tier 1: Features',    dir: 'tier1_features' },
  { id: '2',     name: 'Tier 2: Boundaries',  dir: 'tier2_boundaries' },
  { id: '3',     name: 'Tier 3: Pairwise',    dir: 'tier3_pairwise' },
  { id: '4',     name: 'Tier 4: Scenarios',   dir: 'tier4_scenarios' },
  { id: '5',     name: 'Tier 5: Adversarial', dir: 'tier5_adversarial' },
];

function classifyFileTier(relPath) {
  const normalized = relPath.replace(/\\/g, '/');
  if (normalized.includes('tier1_features/')) return { id: '1', name: 'Tier 1: Features' };
  if (normalized.includes('tier2_boundaries/')) return { id: '2', name: 'Tier 2: Boundaries' };
  if (normalized.includes('tier3_pairwise/')) return { id: '3', name: 'Tier 3: Pairwise' };
  if (normalized.includes('tier4_scenarios/')) return { id: '4', name: 'Tier 4: Scenarios' };
  if (normalized.includes('tier5_adversarial/')) return { id: '5', name: 'Tier 5: Adversarial' };
  return { id: 'infra', name: 'Standalone / Infra' };
}

function scanTestFiles(testsDir) {
  const results = [];
  if (!fs.existsSync(testsDir)) return results;

  function walk(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        // Skip helpers and node_modules if any
        if (entry.name !== 'helpers' && entry.name !== 'node_modules' && !entry.name.startsWith('.')) {
          walk(fullPath);
        }
      } else if (entry.isFile()) {
        if (entry.name.endsWith('.test.js') || entry.name.endsWith('.spec.js')) {
          const rel = path.relative(path.resolve(testsDir, '..'), fullPath);
          const tier = classifyFileTier(rel);
          results.push({
            fullPath,
            relPath: rel.replace(/\\/g, '/'),
            tierId: tier.id,
            tierName: tier.name,
          });
        }
      }
    }
  }

  walk(testsDir);
  results.sort((a, b) => a.relPath.localeCompare(b.relPath));
  return results;
}

// ─── 4. Test Harness Model & Registry ────────────────────────────────────────

class Suite {
  constructor(title, parent = null, options = {}) {
    this.title = title;
    this.parent = parent;
    this.options = options;
    this.beforeAllHooks = [];
    this.afterAllHooks = [];
    this.beforeEachHooks = [];
    this.afterEachHooks = [];
    this.tests = [];
    this.suites = [];
  }

  getFullName() {
    if (!this.parent || !this.parent.title) return this.title;
    return `${this.parent.getFullName()} > ${this.title}`;
  }

  getBeforeEachHooks() {
    const hooks = this.parent ? this.parent.getBeforeEachHooks() : [];
    return hooks.concat(this.beforeEachHooks);
  }

  getAfterEachHooks() {
    // Inner suite hooks run first, then parent hooks
    const parentHooks = this.parent ? this.parent.getAfterEachHooks() : [];
    return [...this.afterEachHooks].concat(parentHooks);
  }
}

class TestCase {
  constructor(title, fn, suite, options = {}) {
    this.title = title;
    this.fn = fn;
    this.suite = suite;
    this.options = options;
    this.duration = 0;
    this.status = 'pending'; // 'passed', 'failed', 'skipped'
    this.error = null;
  }

  getFullName() {
    return `${this.suite.getFullName()} > ${this.title}`;
  }
}

let _currentSuite = null;
let _fileSuites = [];
let _hasOnly = false;

function resetRegistry() {
  _currentSuite = new Suite('');
  _fileSuites = [_currentSuite];
  _hasOnly = false;
}

// ─── 5. BDD Harness API ──────────────────────────────────────────────────────

function describe(title, fn) {
  const suite = new Suite(title, _currentSuite);
  _currentSuite.suites.push(suite);

  const prevSuite = _currentSuite;
  _currentSuite = suite;
  try {
    fn();
  } finally {
    _currentSuite = prevSuite;
  }
}

describe.skip = function (title, fn) {
  const suite = new Suite(title, _currentSuite, { skip: true });
  _currentSuite.suites.push(suite);
  const prevSuite = _currentSuite;
  _currentSuite = suite;
  try {
    fn();
  } finally {
    _currentSuite = prevSuite;
  }
};

describe.only = function (title, fn) {
  _hasOnly = true;
  const suite = new Suite(title, _currentSuite, { only: true });
  _currentSuite.suites.push(suite);
  const prevSuite = _currentSuite;
  _currentSuite = suite;
  try {
    fn();
  } finally {
    _currentSuite = prevSuite;
  }
};

function test(title, fn) {
  const testCase = new TestCase(title, fn, _currentSuite);
  _currentSuite.tests.push(testCase);
}

test.skip = function (title, fn) {
  const testCase = new TestCase(title, fn, _currentSuite, { skip: true });
  _currentSuite.tests.push(testCase);
};

test.only = function (title, fn) {
  _hasOnly = true;
  const testCase = new TestCase(title, fn, _currentSuite, { only: true });
  _currentSuite.tests.push(testCase);
};

const it = test;

function beforeAll(fn) {
  _currentSuite.beforeAllHooks.push(fn);
}

function afterAll(fn) {
  _currentSuite.afterAllHooks.push(fn);
}

function beforeEach(fn) {
  _currentSuite.beforeEachHooks.push(fn);
}

function afterEach(fn) {
  _currentSuite.afterEachHooks.push(fn);
}

// Attach BDD functions to Node.js global
function attachBddGlobals() {
  global.describe = describe;
  global.test = test;
  global.it = it;
  global.beforeAll = beforeAll;
  global.afterAll = afterAll;
  global.beforeEach = beforeEach;
  global.afterEach = afterEach;
}

// ─── 6. Execution Engine ─────────────────────────────────────────────────────

function filterStack(stack) {
  if (!stack) return '';
  const lines = stack.split('\n');
  const filtered = lines.filter(line => {
    if (line.includes('runner.js')) return false;
    if (line.includes('node:internal')) return false;
    if (line.includes('node:vm')) return false;
    return true;
  });
  return filtered.length > 1 ? filtered.join('\n') : lines.slice(0, 5).join('\n');
}

function normalizeError(err) {
  if (err instanceof Error) return err;
  if (err === null || err === undefined) {
    const e = new Error(String(err));
    e.name = 'Error';
    return e;
  }
  if (typeof err === 'object') {
    return {
      name: err.name || 'Error',
      message: err.message !== undefined ? String(err.message) : String(err),
      stack: err.stack,
      diff: err.diff,
    };
  }
  const e = new Error(String(err));
  e.name = 'Error';
  return e;
}

async function runWithTimeout(fn, timeoutMs) {
  if (typeof fn !== 'function') return;

  let timerId;
  const timeoutPromise = new Promise((_, reject) => {
    timerId = setTimeout(() => {
      reject(new Error(`Test timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  const execPromise = Promise.resolve().then(() => fn());

  try {
    await Promise.race([execPromise, timeoutPromise]);
  } finally {
    clearTimeout(timerId);
  }
}

async function executeSuite(suite, options, stats, failures) {
  // Check if suite is skipped
  const isSuiteSkipped = Boolean(suite.options.skip) || (suite.parent && suite.parent.options.skip);

  // Run beforeAll hooks
  if (!isSuiteSkipped) {
    for (const hook of suite.beforeAllHooks) {
      await runWithTimeout(hook, options.timeout);
    }
  }

  // Run tests
  for (const t of suite.tests) {
    if (options.bail && stats.failed > 0) break;

    const isTestSkipped = isSuiteSkipped || Boolean(t.options.skip) || (_hasOnly && !t.options.only && !suite.options.only);

    // Apply regex filter if provided
    let filterPassed = true;
    if (options.filter) {
      try {
        const re = new RegExp(options.filter, 'i');
        filterPassed = re.test(t.getFullName());
      } catch {
        filterPassed = t.getFullName().toLowerCase().includes(options.filter.toLowerCase());
      }
    }

    if (!filterPassed) {
      continue;
    }

    if (isTestSkipped) {
      t.status = 'skipped';
      stats.skipped++;
      stats.total++;
      console.log(`    ${c.yellow}-${c.reset} ${c.dim}${t.title} (SKIPPED)${c.reset}`);
      continue;
    }

    const beforeEachHooks = suite.getBeforeEachHooks();
    const afterEachHooks = suite.getAfterEachHooks();
    const startTime = Date.now();

    try {
      // Run beforeEach hooks
      for (const hook of beforeEachHooks) {
        await runWithTimeout(hook, options.timeout);
      }

      // Run actual test function
      await runWithTimeout(t.fn, options.timeout);

      t.status = 'passed';
      t.duration = Date.now() - startTime;
      stats.passed++;
      stats.total++;
      console.log(`    ${c.green}✔${c.reset} ${t.title} ${c.dim}(${t.duration}ms)${c.reset}`);
    } catch (err) {
      t.status = 'failed';
      t.duration = Date.now() - startTime;
      t.error = err;
      stats.failed++;
      stats.total++;
      failures.push({
        fullName: t.getFullName(),
        error: err,
        duration: t.duration,
      });
      console.log(`    ${c.red}✖${c.reset} ${c.bold}${c.red}${t.title}${c.reset} ${c.dim}(${t.duration}ms)${c.reset}`);
      if (options.verbose) {
        const normErr = normalizeError(err);
        console.log(`      ${c.red}${normErr.message}${c.reset}`);
      }
    } finally {
      // Guaranteed afterEach cleanup
      for (const hook of afterEachHooks) {
        try {
          await runWithTimeout(hook, options.timeout);
        } catch (hookErr) {
          const normHook = normalizeError(hookErr);
          console.error(`      ${c.red}Error in afterEach hook: ${normHook.message}${c.reset}`);
        }
      }
    }
  }

  // Run nested suites
  for (const childSuite of suite.suites) {
    if (options.bail && stats.failed > 0) break;
    await executeSuite(childSuite, options, stats, failures);
  }

  // Run afterAll hooks
  if (!isSuiteSkipped) {
    for (const hook of suite.afterAllHooks) {
      try {
        await runWithTimeout(hook, options.timeout);
      } catch (hookErr) {
        console.error(`    ${c.red}Error in afterAll hook: ${hookErr.message}${c.reset}`);
      }
    }
  }
}

// ─── 7. Summary & Reporting Formatter ────────────────────────────────────────

function printFailures(failures) {
  if (failures.length === 0) return;

  console.log('\n' + '='.repeat(80));
  console.log(`${c.bold}${c.red}FAILURES SUMMARY (${failures.length} ${failures.length === 1 ? 'failure' : 'failures'}):${c.reset}`);
  console.log('='.repeat(80));

  failures.forEach((f, idx) => {
    console.log(`\n${c.bold}${idx + 1}) ${f.fullName}${c.reset}`);
    const err = normalizeError(f.error);
    console.log(`   ${c.red}${err.name || 'Error'}: ${err.message}${c.reset}`);

    if (err.diff) {
      console.log(`\n   ${c.bold}Diff Details:${c.reset}`);
      const diffLines = String(err.diff).split('\n');
      for (const dl of diffLines) {
        console.log(`     ${c.cyan}${dl}${c.reset}`);
      }
    }

    if (err.stack) {
      console.log(`\n   ${c.bold}Stack Trace:${c.reset}`);
      const filtered = filterStack(err.stack);
      console.log(c.dim + filtered.split('\n').map(s => '     ' + s).join('\n') + c.reset);
    }
  });
}

function pad(str, len, align = 'left') {
  const s = String(str);
  if (s.length >= len) return s;
  const diff = len - s.length;
  return align === 'right' ? ' '.repeat(diff) + s : s + ' '.repeat(diff);
}

function printSummaryTable(tierStats, totalDurationMs) {
  console.log('\n' + c.bold + 'TEST EXECUTION SUMMARY BY TIER:' + c.reset);

  const colWidths = {
    tier: 30,
    passed: 8,
    failed: 8,
    skipped: 9,
    total: 8,
    dur: 10,
  };

  const hr = '┌' + '─'.repeat(colWidths.tier + 2) +
             '┬' + '─'.repeat(colWidths.passed + 2) +
             '┬' + '─'.repeat(colWidths.failed + 2) +
             '┬' + '─'.repeat(colWidths.skipped + 2) +
             '┬' + '─'.repeat(colWidths.total + 2) +
             '┬' + '─'.repeat(colWidths.dur + 2) + '┐';

  const midHr = '├' + '─'.repeat(colWidths.tier + 2) +
                '┼' + '─'.repeat(colWidths.passed + 2) +
                '┼' + '─'.repeat(colWidths.failed + 2) +
                '┼' + '─'.repeat(colWidths.skipped + 2) +
                '┼' + '─'.repeat(colWidths.total + 2) +
                '┼' + '─'.repeat(colWidths.dur + 2) + '┤';

  const bottomHr = '└' + '─'.repeat(colWidths.tier + 2) +
                   '┴' + '─'.repeat(colWidths.passed + 2) +
                   '┴' + '─'.repeat(colWidths.failed + 2) +
                   '┴' + '─'.repeat(colWidths.skipped + 2) +
                   '┴' + '─'.repeat(colWidths.total + 2) +
                   '┴' + '─'.repeat(colWidths.dur + 2) + '┘';

  console.log(hr);
  console.log(`│ ${pad('Tier / Suite', colWidths.tier)} │ ${pad('Passed', colWidths.passed, 'right')} │ ${pad('Failed', colWidths.failed, 'right')} │ ${pad('Skipped', colWidths.skipped, 'right')} │ ${pad('Total', colWidths.total, 'right')} │ ${pad('Duration', colWidths.dur, 'right')} │`);
  console.log(midHr);

  let grandPassed = 0;
  let grandFailed = 0;
  let grandSkipped = 0;
  let grandTotal = 0;

  for (const [tierName, stat] of Object.entries(tierStats)) {
    if (stat.total === 0) continue;
    grandPassed += stat.passed;
    grandFailed += stat.failed;
    grandSkipped += stat.skipped;
    grandTotal += stat.total;
    const durSec = (stat.duration / 1000).toFixed(2) + 's';
    const failedStr = stat.failed > 0 ? `${c.red}${pad(stat.failed, colWidths.failed, 'right')}${c.reset}` : pad(0, colWidths.failed, 'right');
    console.log(`│ ${pad(tierName, colWidths.tier)} │ ${pad(stat.passed, colWidths.passed, 'right')} │ ${failedStr} │ ${pad(stat.skipped, colWidths.skipped, 'right')} │ ${pad(stat.total, colWidths.total, 'right')} │ ${pad(durSec, colWidths.dur, 'right')} │`);
  }

  console.log(midHr);
  const totalDurSec = (totalDurationMs / 1000).toFixed(2) + 's';
  const totalFailedStr = grandFailed > 0 ? `${c.red}${pad(grandFailed, colWidths.failed, 'right')}${c.reset}` : pad(0, colWidths.failed, 'right');
  console.log(`│ ${c.bold}${pad('TOTALS', colWidths.tier)}${c.reset} │ ${c.bold}${pad(grandPassed, colWidths.passed, 'right')}${c.reset} │ ${c.bold}${totalFailedStr}${c.reset} │ ${c.bold}${pad(grandSkipped, colWidths.skipped, 'right')}${c.reset} │ ${c.bold}${pad(grandTotal, colWidths.total, 'right')}${c.reset} │ ${c.bold}${pad(totalDurSec, colWidths.dur, 'right')}${c.reset} │`);
  console.log(bottomHr);

  // Final banner
  if (grandFailed === 0) {
    console.log(`\n${c.bold}${c.green}✔ ALL TESTS PASSED${c.reset} (${grandPassed} passed in ${totalDurSec})\n`);
  } else {
    console.log(`\n${c.bold}${c.red}✖ TEST SUITE FAILED${c.reset} (${grandFailed} failed, ${grandPassed} passed, ${grandTotal} total in ${totalDurSec})\n`);
  }
}

// ─── 8. CLI Runner Entrypoint ────────────────────────────────────────────────

async function runCli(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);

  if (options.help) {
    printHelp();
    return 0;
  }

  // Validate tier argument
  const validTiers = ['1', '2', '3', '4', '5', 'infra', 'all'];
  if (!validTiers.includes(String(options.tier).toLowerCase())) {
    console.error(`${c.red}Error: Invalid tier "${options.tier}". Expected one of: ${validTiers.join(', ')}.${c.reset}`);
    return 1;
  }

  // Validate regex filter
  if (options.filter) {
    try {
      new RegExp(options.filter, 'i');
    } catch {
      console.error(`${c.red}Error: Invalid regular expression pattern in --filter.${c.reset}`);
      return 1;
    }
  }

  const projectRoot = path.resolve(__dirname, '..');
  const testsDir = path.join(projectRoot, 'tests');

  let testFiles = [];

  // Positional file targets specified
  if (options.files.length > 0) {
    for (const f of options.files) {
      const fullPath = path.isAbsolute(f) ? f : path.resolve(process.cwd(), f);
      if (!fs.existsSync(fullPath)) {
        console.error(`${c.red}Error: Test file not found: ${f}${c.reset}`);
        return 1;
      }
      const rel = path.relative(projectRoot, fullPath);
      const tier = classifyFileTier(rel);
      testFiles.push({
        fullPath,
        relPath: rel.replace(/\\/g, '/'),
        tierId: tier.id,
        tierName: tier.name,
      });
    }
  } else {
    // Dynamic discovery
    const allDiscovered = scanTestFiles(testsDir);

    if (options.tier !== 'all') {
      const targetTier = String(options.tier).toLowerCase();
      testFiles = allDiscovered.filter(f => f.tierId === targetTier);
      if (testFiles.length === 0) {
        console.error(`${c.red}No test files found matching tier: ${options.tier}${c.reset}`);
        return 1;
      }
    } else {
      testFiles = allDiscovered;
    }
  }

  if (testFiles.length === 0) {
    console.log(`${c.yellow}No test files found to execute.${c.reset}`);
    return 0;
  }

  // Attach global test harness API
  attachBddGlobals();

  console.log(`\n${c.bold}Running ${testFiles.length} test ${testFiles.length === 1 ? 'suite' : 'suites'}...${c.reset}\n`);

  const globalStart = Date.now();
  const allFailures = [];
  const tierStats = {};

  // Initialize tier stats
  for (const t of TIERS_CONFIG) {
    tierStats[t.name] = { passed: 0, failed: 0, skipped: 0, total: 0, duration: 0 };
  }

  for (const file of testFiles) {
    if (options.bail && allFailures.length > 0) break;

    console.log(`${c.bold}${c.cyan}[${file.tierName}]${c.reset} ${file.relPath}`);

    // Reset harness registry for each file
    resetRegistry();

    const fileStartTime = Date.now();

    try {
      // Require the test file
      // Delete from require cache to ensure fresh execution
      delete require.cache[require.resolve(file.fullPath)];
      require(file.fullPath);
    } catch (loadErr) {
      console.log(`  ${c.red}✖ Failed to load test file: ${loadErr.message}${c.reset}`);
      allFailures.push({
        fullName: file.relPath,
        error: loadErr,
        duration: 0,
      });
      const stat = tierStats[file.tierName] || { passed: 0, failed: 0, skipped: 0, total: 0, duration: 0 };
      stat.failed++;
      stat.total++;
      tierStats[file.tierName] = stat;
      if (options.bail) break;
      continue;
    }

    const fileStats = { passed: 0, failed: 0, skipped: 0, total: 0 };
    const rootSuite = _fileSuites[0];

    await executeSuite(rootSuite, options, fileStats, allFailures);

    const fileDuration = Date.now() - fileStartTime;
    const stat = tierStats[file.tierName] || { passed: 0, failed: 0, skipped: 0, total: 0, duration: 0 };
    stat.passed += fileStats.passed;
    stat.failed += fileStats.failed;
    stat.skipped += fileStats.skipped;
    stat.total += fileStats.total;
    stat.duration += fileDuration;
    tierStats[file.tierName] = stat;
  }

  const grandDuration = Date.now() - globalStart;

  // Print failures summary
  printFailures(allFailures);

  // Print ASCII summary table
  printSummaryTable(tierStats, grandDuration);

  return allFailures.length === 0 ? 0 : 1;
}

// ─── 9. Execution or Module Export ───────────────────────────────────────────

module.exports = {
  describe,
  test,
  it,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
  runCli,
  parseArgs,
  scanTestFiles,
  runWithTimeout,
  normalizeError,
};

if (require.main === module) {
  runCli().then(code => {
    process.exit(code);
  }).catch(err => {
    console.error(`\n${c.red}FATAL ERROR: ${err?.stack || err}${c.reset}`);
    process.exit(1);
  });
}
