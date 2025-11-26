export interface return {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  // Add more fields
}

export type returnInput = Omit<return, 'id' | 'createdAt' | 'updatedAt'>;

export type returnUpdate = Partial<returnInput>;
