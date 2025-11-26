export interface refund {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  // Add more fields
}

export type refundInput = Omit<refund, 'id' | 'createdAt' | 'updatedAt'>;

export type refundUpdate = Partial<refundInput>;
