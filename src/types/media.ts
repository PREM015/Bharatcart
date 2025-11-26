export interface media {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  // Add more fields
}

export type mediaInput = Omit<media, 'id' | 'createdAt' | 'updatedAt'>;

export type mediaUpdate = Partial<mediaInput>;
