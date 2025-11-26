export class PaymentException extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = 'PaymentException';
    Object.setPrototypeOf(this, PaymentException.prototype);
  }
}
