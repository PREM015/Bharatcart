/**
 * Soak Test
 * Purpose: Tests system stability over extended period
 * Description: K6 endurance testing script
 */

import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '5m', target: 100 },    // Ramp-up
    { duration: '4h', target: 100 },    // Stay at 100 users for 4 hours
    { duration: '5m', target: 0 },      // Ramp-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],     // Very low error rate for soak test
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  http.get(`${BASE_URL}/`);
  sleep(3);
  
  http.get(`${BASE_URL}/api/products`);
  sleep(3);
}
