export interface banner {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  // Add more fields
}

export type bannerInput = Omit<banner, 'id' | 'createdAt' | 'updatedAt'>;

export type bannerUpdate = Partial<bannerInput>;
