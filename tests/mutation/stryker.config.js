/**
 * Stryker Mutation Testing Configuration
 * Purpose: Tests the quality of tests by introducing mutations
 * Description: Ensures tests catch bugs effectively
 */

/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
module.exports = {
  packageManager: 'npm',
  reporters: ['html', 'clear-text', 'progress', 'dashboard'],
  testRunner: 'jest',
  coverageAnalysis: 'perTest',
  
  mutate: [
    'src/**/*.ts',
    'src/**/*.tsx',
    '!src/**/*.test.ts',
    '!src/**/*.test.tsx',
    '!src/**/*.spec.ts',
    '!src/**/*.spec.tsx',
    '!src/**/*.d.ts',
  ],

  thresholds: {
    high: 80,
    low: 60,
    break: 50,
  },

  timeoutMS: 60000,
  maxConcurrentTestRunners: 4,

  jest: {
    projectType: 'custom',
    configFile: 'jest.config.js',
    enableFindRelatedTests: true,
  },

  htmlReporter: {
    fileName: 'mutation-report.html',
  },

  dashboard: {
    reportType: 'full',
  },

  mutator: {
    plugins: ['@stryker-mutator/typescript-checker'],
  },
};
