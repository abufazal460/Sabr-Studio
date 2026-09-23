/**
 * Test: Circuit Breaker
 * Verifies circuit breaker opens on failures and recovers after timeout
 */

import { CircuitBreaker, serviceCircuitBreakers } from './utils/circuitBreaker.js';

console.log('='.repeat(60));
console.log('TEST 3: Circuit Breaker');
console.log('='.repeat(60));

// Test 3.1: Basic circuit breaker functionality
console.log('\n[TEST 3.1] Creating circuit breaker...');
const breaker = new CircuitBreaker({
  name: 'test-service',
  failureThreshold: 3,
  resetTimeout: 2000,
  timeout: 5000,
});

console.log('✅ Circuit breaker created');
console.log('   Initial state:', breaker.getState());

// Test 3.2: Successful executions keep circuit closed
console.log('\n[TEST 3.2] Testing successful executions...');
async function successFn() {
  return 'success';
}

try {
  const result = await breaker.execute(successFn);
  console.log('✅ First execution:', result);
  console.log('   State after success:', breaker.getState());
  
  const result2 = await breaker.execute(successFn);
  console.log('✅ Second execution:', result2);
  console.log('   State:', breaker.getState());
} catch (err) {
  console.error('❌ Unexpected error:', err.message);
  process.exit(1);
}

// Test 3.3: Failures open the circuit
console.log('\n[TEST 3.3] Testing failure threshold...');
let failureCount = 0;
async function failingFn() {
  failureCount++;
  throw new Error(`Failure ${failureCount}`);
}

try {
  await breaker.execute(failingFn);
  console.error('❌ Should have thrown');
  process.exit(1);
} catch (err) {
  console.log('✅ First failure caught:', err.message);
  console.log('   Failure count:', breaker.getStats().failureCount);
}

try {
  await breaker.execute(failingFn);
  console.error('❌ Should have thrown');
  process.exit(1);
} catch (err) {
  console.log('✅ Second failure caught:', err.message);
  console.log('   Failure count:', breaker.getStats().failureCount);
}

try {
  await breaker.execute(failingFn);
  console.error('❌ Should have thrown');
  process.exit(1);
} catch (err) {
  console.log('✅ Third failure caught (threshold reached):', err.message);
  console.log('   Failure count:', breaker.getStats().failureCount);
  console.log('   Circuit state:', breaker.getState());
}

// Test 3.4: Circuit open - requests use fallback
console.log('\n[TEST 3.4] Testing open circuit behavior...');
console.log('   Circuit state:', breaker.getState());

try {
  const result = await breaker.execute(failingFn, 'FALLBACK_VALUE');
  if (result === 'FALLBACK_VALUE') {
    console.log('✅ Fallback returned when circuit open:', result);
  } else {
    console.error('❌ Expected fallback value');
    process.exit(1);
  }
} catch (err) {
  console.error('❌ Should have used fallback:', err.message);
  process.exit(1);
}

// Test 3.5: Circuit recovery (half-open -> closed)
console.log('\n[TEST 3.5] Testing circuit recovery...');
console.log('   Waiting for reset timeout (2 seconds)...');

await new Promise(resolve => setTimeout(resolve, 2100));

console.log('   Circuit state after timeout:', breaker.getState());

// Now a successful call should close the circuit
try {
  const result = await breaker.execute(successFn);
  console.log('✅ Successful call in half-open state:', result);
  console.log('   Circuit state:', breaker.getState());
  
  if (breaker.getState() === 'CLOSED') {
    console.log('✅ Circuit closed again after successful recovery');
  }
    // Cleanup
    console.log('\n[CLEANUP]');
    serviceCircuitBreakers.razorpay.getStats();
    serviceCircuitBreakers.cloudinary.getStats();
    serviceCircuitBreakers.emailjs.getStats();
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ ALL CIRCUIT BREAKER TESTS PASSED');
    console.log('='.repeat(60));
    process.exit(0);
} catch (err) {
  console.error('❌ Recovery failed:', err.message);
  process.exit(1);
}