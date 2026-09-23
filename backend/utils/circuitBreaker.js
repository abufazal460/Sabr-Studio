/**
 * Circuit Breaker implementation for external service calls
 * Prevents cascading failures when external services are down
 */

export class CircuitBreaker {
  constructor({
    name = 'circuit-breaker',
    failureThreshold = 5,
    resetTimeout = 30000,
    timeout = 10000,
    halfOpenRequests = 1,
  } = {}) {
    this.name = name;
    this.failureThreshold = failureThreshold;
    this.resetTimeout = resetTimeout;
    this.timeout = timeout;
    this.halfOpenRequests = halfOpenRequests;
    
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.halfOpenAttempts = 0;
  }

  getState() {
    if (this.state === 'OPEN') {
      const timeSinceFailure = Date.now() - (this.lastFailureTime || 0);
      if (timeSinceFailure >= this.resetTimeout) {
        this.state = 'HALF_OPEN';
        this.halfOpenAttempts = 0;
        console.log(`[CircuitBreaker:${this.name}] Transitioning to HALF_OPEN`);
      }
    }
    return this.state;
  }

  async execute(fn, fallback = null) {
    const state = this.getState();
    
    if (state === 'OPEN') {
      console.warn(`[CircuitBreaker:${this.name}] Circuit OPEN - using fallback`);
      return fallback !== undefined ? fallback : Promise.reject(
        new Error(`${this.name} circuit is open`)
      );
    }

    try {
      const result = await this.withTimeout(fn);
      
      if (state === 'HALF_OPEN') {
        this.halfOpenAttempts++;
        this.successCount++;
        
        if (this.successCount >= this.halfOpenRequests) {
          this._reset();
          console.log(`[CircuitBreaker:${this.name}] Circuit CLOSED after successful HALF_OPEN`);
        }
      }
      
      return result;
    } catch (error) {
      this._recordFailure();
      throw error;
    }
  }

  async withTimeout(fn) {
    return Promise.race([
      fn(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error(`Operation timed out after ${this.timeout}ms`)), this.timeout)
      )
    ]);
  }

  _recordFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    this.successCount = 0;
    
    console.warn(`[CircuitBreaker:${this.name}] Failure recorded (${this.failureCount}/${this.failureThreshold})`);
    
    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      console.error(`[CircuitBreaker:${this.name}] Circuit OPEN due to ${this.failureCount} failures`);
    }
  }

  _reset() {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.halfOpenAttempts = 0;
  }

  getStats() {
    return {
      name: this.name,
      state: this.getState(),
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      failureThreshold: this.failureThreshold,
      resetTimeout: this.resetTimeout,
      timeout: this.timeout,
    };
  }
}

/**
 * Create service-specific circuit breakers
 */
export const serviceCircuitBreakers = {
  razorpay: new CircuitBreaker({
    name: 'razorpay',
    failureThreshold: 5,
    resetTimeout: 30000,
    timeout: 10000,
  }),
  cloudinary: new CircuitBreaker({
    name: 'cloudinary',
    failureThreshold: 5,
    resetTimeout: 30000,
    timeout: 15000,
  }),
  emailjs: new CircuitBreaker({
    name: 'emailjs',
    failureThreshold: 5,
    resetTimeout: 60000,
    timeout: 10000,
  }),
};

/**
 * Helper to execute with circuit breaker and handle errors
 */
export async function withCircuitBreaker(breaker, fn, fallback = null) {
  try {
    return await breaker.execute(fn);
  } catch (error) {
    if (fallback !== undefined) {
      return fallback;
    }
    throw error;
  }
}
