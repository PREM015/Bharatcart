export interface subscription {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  // Add more fields
}

export type subscriptionInput = Omit<subscription, 'id' | 'createdAt' | 'updatedAt'>;

export type subscriptionUpdate = Partial<subscriptionInput>;
