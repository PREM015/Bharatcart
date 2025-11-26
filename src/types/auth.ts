export interface auth {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  // Add more fields
}

export type authInput = Omit<auth, 'id' | 'createdAt' | 'updatedAt'>;

export type authUpdate = Partial<authInput>;
