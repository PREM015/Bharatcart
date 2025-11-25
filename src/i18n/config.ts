// Internationalization Configuration
export const I18N_CONFIG = {
  defaultLocale: 'en',
  locales: ['en', 'es', 'fr', 'de', 'ar', 'zh', 'ja', 'hi'],
  rtlLocales: ['ar'],
  fallbackLocale: 'en'
};

export type Locale = typeof I18N_CONFIG.locales[number];
