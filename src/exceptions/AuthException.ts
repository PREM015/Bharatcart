export class AuthException extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = 'AuthException';
    Object.setPrototypeOf(this, AuthException.prototype);
  }
}
