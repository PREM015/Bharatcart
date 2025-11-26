export interface settings {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  // Add more fields
}

export type settingsInput = Omit<settings, 'id' | 'createdAt' | 'updatedAt'>;

export type settingsUpdate = Partial<settingsInput>;
