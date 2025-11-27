/**
 * BackstopJS Visual Regression Configuration
 * Purpose: Detects unintended visual changes
 * Description: Compares screenshots across versions
 */

module.exports = {
  id: 'bharatcart_visual_regression',
  viewports: [
    {
      label: 'phone',
      width: 375,
      height: 667,
    },
    {
      label: 'tablet',
      width: 768,
      height: 1024,
    },
    {
      label: 'desktop',
      width: 1920,
      height: 1080,
    },
  ],
  scenarios: [
    {
      label: 'Homepage',
      url: 'http://localhost:3000',
      delay: 1000,
      misMatchThreshold: 0.1,
    },
    {
      label: 'Product Listing',
      url: 'http://localhost:3000/products',
      delay: 1000,
      misMatchThreshold: 0.1,
    },
    {
      label: 'Product Details',
      url: 'http://localhost:3000/products/1',
      delay: 1000,
      misMatchThreshold: 0.1,
    },
    {
      label: 'Cart',
      url: 'http://localhost:3000/cart',
      delay: 1000,
      misMatchThreshold: 0.1,
      cookiePath: 'tests/regression/cookies.json',
    },
    {
      label: 'Checkout',
      url: 'http://localhost:3000/checkout',
      delay: 1000,
      misMatchThreshold: 0.1,
      cookiePath: 'tests/regression/cookies.json',
    },
  ],
  paths: {
    bitmaps_reference: 'tests/regression/visual-regression/reference',
    bitmaps_test: 'tests/regression/visual-regression/test',
    engine_scripts: 'tests/regression/visual-regression/engine_scripts',
    html_report: 'tests/regression/visual-regression/html_report',
    ci_report: 'tests/regression/visual-regression/ci_report',
  },
  report: ['browser', 'CI'],
  engine: 'puppeteer',
  engineOptions: {
    args: ['--no-sandbox'],
  },
  asyncCaptureLimit: 5,
  asyncCompareLimit: 50,
  debug: false,
  debugWindow: false,
};
