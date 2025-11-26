export interface seo {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  // Add more fields
}

export type seoInput = Omit<seo, 'id' | 'createdAt' | 'updatedAt'>;

export type seoUpdate = Partial<seoInput>;
