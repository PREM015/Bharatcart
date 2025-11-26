export class DatabaseException extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = 'DatabaseException';
    Object.setPrototypeOf(this, DatabaseException.prototype);
  }
}
