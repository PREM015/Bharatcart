export interface sort {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  // Add more fields
}

export type sortInput = Omit<sort, 'id' | 'createdAt' | 'updatedAt'>;

export type sortUpdate = Partial<sortInput>;
