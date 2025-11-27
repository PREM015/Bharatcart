/**
 * Stress Test
 * Purpose: Tests system behavior under heavy load
 * Description: K6 stress testing script
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '2m', target: 100 },   // Ramp-up to 100 users
    { duration: '5m', target: 100 },   // Stay at 100 users
    { duration: '2m', target: 200 },   // Spike to 200 users
    { duration: '5m', target: 200 },   // Stay at 200 users
    { duration: '2m', target: 500 },   // Spike to 500 users
    { duration: '5m', target: 500 },   // Stay at 500 users
    { duration: '10m', target: 0 },    // Ramp-down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'], // 95% < 500ms, 99% < 1s
    http_req_failed: ['rate<0.05'],                  // Error rate < 5%
    errors: ['rate<0.1'],                            // Custom error rate < 10%
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  // Homepage
  let res = http.get(`${BASE_URL}/`);
  check(res, {
    'homepage status is 200': (r) => r.status === 200,
    'homepage loads in < 500ms': (r) => r.timings.duration < 500,
  }) || errorRate.add(1);

  sleep(1);

  // Products page
  res = http.get(`${BASE_URL}/api/products?page=1&limit=20`);
  check(res, {
    'products API status is 200': (r) => r.status === 200,
    'products API returns data': (r) => {
      const body = JSON.parse(r.body);
      return body.data && body.data.length > 0;
    },
  }) || errorRate.add(1);

  sleep(1);

  // Product details
  res = http.get(`${BASE_URL}/api/products/1`);
  check(res, {
    'product details status is 200': (r) => r.status === 200,
  }) || errorRate.add(1);

  sleep(1);

  // Search
  res = http.get(`${BASE_URL}/api/search?q=laptop`);
  check(res, {
    'search API status is 200': (r) => r.status === 200,
  }) || errorRate.add(1);

  sleep(2);

  // Add to cart (authenticated)
  const token = login();
  if (token) {
    res = http.post(
      `${BASE_URL}/api/cart/items`,
      JSON.stringify({
        productId: 1,
        quantity: 1,
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      }
    );
    check(res, {
      'add to cart status is 200': (r) => r.status === 200,
    }) || errorRate.add(1);
  }

  sleep(1);
}

function login() {
  const res = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({
      email: 'loadtest@example.com',
      password: 'password123',
    }),
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );

  if (res.status === 200) {
    const body = JSON.parse(res.body);
    return body.token;
  }
  return null;
}

export function handleSummary(data) {
  return {
    'summary.html': htmlReport(data),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

function htmlReport(data) {
  return `
<!DOCTYPE html>
<html>
<head>
  <title>K6 Load Test Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    h1 { color: #333; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #4CAF50; color: white; }
    .pass { color: green; }
    .fail { color: red; }
  </style>
</head>
<body>
  <h1>Load Test Report</h1>
  <p>Generated: ${new Date().toISOString()}</p>
  
  <h2>Summary</h2>
  <table>
    <tr>
      <th>Metric</th>
      <th>Value</th>
    </tr>
    <tr>
      <td>Total Requests</td>
      <td>${data.metrics.http_reqs.values.count}</td>
    </tr>
    <tr>
      <td>Failed Requests</td>
      <td>${data.metrics.http_req_failed.values.rate * 100}%</td>
    </tr>
    <tr>
      <td>Avg Response Time</td>
      <td>${data.metrics.http_req_duration.values.avg.toFixed(2)}ms</td>
    </tr>
    <tr>
      <td>P95 Response Time</td>
      <td>${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms</td>
    </tr>
    <tr>
      <td>P99 Response Time</td>
      <td>${data.metrics.http_req_duration.values['p(99)'].toFixed(2)}ms</td>
    </tr>
  </table>
</body>
</html>
  `;
}
