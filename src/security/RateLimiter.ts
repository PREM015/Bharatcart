// API Rate Limiting
export class RateLimiter {
  private requests: Map<string, number[]> = new Map();

  async checkLimit(identifier: string, maxRequests: number = 100, windowMs: number = 60000): Promise<boolean> {
    const now = Date.now();
    const userRequests = this.requests.get(identifier) || [];
    
    // Remove old requests outside the window
    const recentRequests = userRequests.filter(time => now - time < windowMs);
    
    if (recentRequests.length >= maxRequests) {
      return false;
    }
    
    recentRequests.push(now);
    this.requests.set(identifier, recentRequests);
    
    return true;
  }
}
