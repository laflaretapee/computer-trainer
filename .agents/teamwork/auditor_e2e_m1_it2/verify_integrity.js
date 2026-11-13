'use strict';
const fs = require('node:fs');
const path = require('node:path');

const content = fs.readFileSync('tests/test_infra.test.js', 'utf8');

// Count test cases
const testMatches = content.match(/test\s*\(\s*(['"`])(?:(?!\1).)*\1/g) || [];
console.log('Total test definitions:', testMatches.length);

// Count assert calls
const assertMatches = content.match(/\bassert[A-Za-z0-9_]*\s*\(/g) || [];
console.log('Total assert calls:', assertMatches.length);

// Check if any test has zero assert calls
// Parse describe and test blocks
const lines = content.split('\n');
let currentTest = null;
let currentTestAssertCount = 0;
let inTest = false;
let testAssertMap = {};

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const testMatch = line.match(/test\s*\(\s*(['"`])((?:(?!\1).)*)\1/);
  if (testMatch) {
    if (currentTest) {
      testAssertMap[currentTest] = currentTestAssertCount;
    }
    currentTest = testMatch[2];
    currentTestAssertCount = 0;
    inTest = true;
  }
  if (inTest) {
    const assertsOnLine = line.match(/\bassert[A-Za-z0-9_]*\s*\(/g);
    if (assertsOnLine) {
      currentTestAssertCount += assertsOnLine.length;
    }
  }
}
if (currentTest) {
  testAssertMap[currentTest] = currentTestAssertCount;
}

console.log('Total mapped tests:', Object.keys(testAssertMap).length);
let emptyTests = [];
for (const [title, count] of Object.entries(testAssertMap)) {
  if (count === 0) {
    // Note: some tests might call expect or runner utilities or throw manually
    emptyTests.push(title);
  }
}
console.log('Tests with zero assertions:', emptyTests);
