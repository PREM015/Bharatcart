/**
 * Spike Test
 * Purpose: Tests system behavior under sudden traffic spikes
 * Description: K6 spike testing script
 */

import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 50 },    // Normal load
    { duration: '1m', target: 1000 },   // Sudden spike!
    { duration: '30s', target: 50 },    // Return to normal
    { duration: '1m', target: 1000 },   // Another spike
    { duration: '30s', target: 0 },     // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],  // 95% should be < 2s (more lenient for spikes)
    http_req_failed: ['rate<0.1'],      // Error rate < 10%
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  const res = http.get(`${BASE_URL}/`);
  check(res, {
    'status is 200': (r) => r.status === 200,
  });
  sleep(1);
}
