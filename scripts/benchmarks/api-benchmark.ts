/**
 * API Performance Benchmarks
 * Purpose: Tests API endpoint response times under load
 * Description: Measures latency, throughput, and error rates
 */

import autocannon from 'autocannon';
import { table } from 'console';

const API_URL = process.env.API_URL || 'http://localhost:3000';

interface BenchmarkResult {
  endpoint: string;
  latency: { mean: number; p50: number; p95: number; p99: number };
  throughput: number;
  errors: number;
}

async function runBenchmark(endpoint: string, duration: number = 10): Promise<BenchmarkResult> {
  console.log(`🚀 Benchmarking ${endpoint}...`);

  const result = await autocannon({
    url: `${API_URL}${endpoint}`,
    connections: 10,
    duration,
    pipelining: 1,
  });

  return {
    endpoint,
    latency: {
      mean: result.latency.mean,
      p50: result.latency.p50,
      p95: result.latency.p95,
      p99: result.latency.p99,
    },
    throughput: result.throughput.mean,
    errors: result.errors,
  };
}

async function main() {
  console.log('📊 Starting API Benchmarks...
');

  const endpoints = [
    '/api/products',
    '/api/products/1',
    '/api/cart',
    '/api/users/me',
    '/health',
  ];

  const results: BenchmarkResult[] = [];

  for (const endpoint of endpoints) {
    const result = await runBenchmark(endpoint);
    results.push(result);
  }

  // Display results
  console.log('
📈 Benchmark Results:
');
  console.table(
    results.map((r) => ({
      Endpoint: r.endpoint,
      'Mean (ms)': r.latency.mean.toFixed(2),
      'P95 (ms)': r.latency.p95.toFixed(2),
      'P99 (ms)': r.latency.p99.toFixed(2),
      'Throughput (req/s)': r.throughput.toFixed(2),
      Errors: r.errors,
    }))
  );

  // Check thresholds
  const failed = results.filter(
    (r) => r.latency.p95 > 500 || r.errors > 0
  );

  if (failed.length > 0) {
    console.error('
❌ Performance thresholds exceeded!');
    process.exit(1);
  }

  console.log('
✅ All benchmarks passed!');
}

main().catch(console.error);
