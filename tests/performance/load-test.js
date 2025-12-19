import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');

// Test configuration
export const options = {
  stages: [
    { duration: '2m', target: 100 }, // Ramp up to 100 users
    { duration: '5m', target: 100 }, // Stay at 100 users
    { duration: '2m', target: 200 }, // Ramp up to 200 users
    { duration: '5m', target: 200 }, // Stay at 200 users
    { duration: '2m', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests under 500ms
    http_req_failed: ['rate<0.1'],    // Error rate under 10%
    errors: ['rate<0.1'],             // Custom error rate under 10%
  },
};

const BASE_URL = 'http://localhost:3000';

// Test data
const testEmail = `test-${Date.now()}@example.com`;
const testPassword = 'password123';

export function setup() {
  // Create a test user for authenticated tests
  const response = http.post(`${BASE_URL}/api/public/signup`, JSON.stringify({
    email: testEmail,
    password: testPassword,
    source: 'load-test'
  }), {
    headers: { 'Content-Type': 'application/json' },
  });

  if (response.status !== 201) {
    throw new Error('Failed to create test user');
  }

  return response.json().token;
}

export default function(token) {
  // Test 1: Health check
  const healthResponse = http.get(`${BASE_URL}/health`);
  check(healthResponse, {
    'health check status is 200': (r) => r.status === 200,
    'health check response time < 100ms': (r) => r.timings.duration < 100,
  });

  // Test 2: Public inbox creation (unauthenticated)
  const inboxResponse = http.post(`${BASE_URL}/public/inboxes`, JSON.stringify({
    name: `test-${Date.now()}-${__VU}-${__ITER}`,
  }), {
    headers: { 'Content-Type': 'application/json' },
  });

  const inboxSuccess = check(inboxResponse, {
    'inbox creation status is 201': (r) => r.status === 201,
    'inbox created has email': (r) => JSON.parse(r.body).email.includes('@tempmail.pro'),
    'inbox creation response time < 500ms': (r) => r.timings.duration < 500,
  });
  errorRate.add(!inboxSuccess);

  // Test 3: Authentication (with token)
  if (token) {
    const authResponse = http.get(`${BASE_URL}/api/domains`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const authSuccess = check(authResponse, {
      'authenticated request status is 200': (r) => r.status === 200,
      'authenticated request response time < 300ms': (r) => r.timings.duration < 300,
    });
    errorRate.add(!authSuccess);
  }

  // Test 4: API rate limiting
  const rapidRequests = Array(5).fill(null).map((_, i) =>
    http.post(`${BASE_URL}/public/inboxes`, JSON.stringify({
      name: `rate-test-${i}-${__VU}`,
    }), {
      headers: { 'Content-Type': 'application/json' },
    })
  );

  rapidRequests.forEach((response, i) => {
    const success = check(response, {
      [`rate test ${i} handled correctly`]: (r) => [200, 429].includes(r.status),
    });
    errorRate.add(!success && r.status !== 429); // Don't count 429 as error for rate limiting
  });

  // Test 5: Sitemap generation
  const sitemapResponse = http.get(`${BASE_URL}/sitemap.xml`);
  check(sitemapResponse, {
    'sitemap status is 200': (r) => r.status === 200,
    'sitemap content-type is xml': (r) => r.headers['Content-Type'].includes('xml'),
  });

  // Test 6: Support ticket creation
  const supportResponse = http.post(`${BASE_URL}/support/tickets`, JSON.stringify({
    name: `Load Test User ${__VU}`,
    email: `loadtest-${__VU}@example.com`,
    subject: 'Load test support request',
    category: 'technical',
    message: 'This is a test support request during load testing',
    priority: 'low'
  }), {
    headers: { 'Content-Type': 'application/json' },
  });

  check(supportResponse, {
    'support ticket creation status is 201': (r) => r.status === 201,
    'support ticket has ID': (r) => JSON.parse(r.body).ticketId !== undefined,
  });

  sleep(1); // Pause between iterations
}

export function teardown(token) {
  // Cleanup: Delete test user if needed
  // This would require an admin endpoint
  console.log(`Load test completed. Test user: ${testEmail}`);
}

// Advanced performance test for specific scenarios
export function handleSummary(data) {
  console.log('\n=== Load Test Summary ===');
  console.log(`Total requests: ${data.metrics.http_reqs.count}`);
  console.log(`Average request time: ${data.metrics.http_req_duration.avg}ms`);
  console.log(`95th percentile: ${data.metrics.http_req_duration['p(95)']}ms`);
  console.log(`Error rate: ${(data.metrics.http_req_failed.rate * 100).toFixed(2)}%`);

  // Custom checks
  if (data.metrics.errors && data.metrics.errors.rate > 0.1) {
    console.warn(`⚠️  High error rate detected: ${(data.metrics.errors.rate * 100).toFixed(2)}%`);
  }

  if (data.metrics.http_req_duration['p(95)'] > 500) {
    console.warn(`⚠️  Slow response time: ${data.metrics.http_req_duration['p(95)']}ms`);
  }
}