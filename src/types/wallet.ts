export interface wallet {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  // Add more fields
}

export type walletInput = Omit<wallet, 'id' | 'createdAt' | 'updatedAt'>;

export type walletUpdate = Partial<walletInput>;
