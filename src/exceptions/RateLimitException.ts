export class RateLimitException extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = 'RateLimitException';
    Object.setPrototypeOf(this, RateLimitException.prototype);
  }
}
