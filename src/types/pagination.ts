export interface pagination {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  // Add more fields
}

export type paginationInput = Omit<pagination, 'id' | 'createdAt' | 'updatedAt'>;

export type paginationUpdate = Partial<paginationInput>;
