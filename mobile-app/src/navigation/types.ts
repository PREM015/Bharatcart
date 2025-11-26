export interface types {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  // Add more fields
}

export type typesInput = Omit<types, 'id' | 'createdAt' | 'updatedAt'>;

export type typesUpdate = Partial<typesInput>;
