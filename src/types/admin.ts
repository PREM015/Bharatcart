export interface admin {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  // Add more fields
}

export type adminInput = Omit<admin, 'id' | 'createdAt' | 'updatedAt'>;

export type adminUpdate = Partial<adminInput>;
