export interface brand {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  // Add more fields
}

export type brandInput = Omit<brand, 'id' | 'createdAt' | 'updatedAt'>;

export type brandUpdate = Partial<brandInput>;
