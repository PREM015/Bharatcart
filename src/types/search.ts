export interface search {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  // Add more fields
}

export type searchInput = Omit<search, 'id' | 'createdAt' | 'updatedAt'>;

export type searchUpdate = Partial<searchInput>;
