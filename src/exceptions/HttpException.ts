export class HttpException extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = 'HttpException';
    Object.setPrototypeOf(this, HttpException.prototype);
  }
}
