export const SENTRY.SERVER.CONFIG_CONFIG = {
  // Add configuration options
  enabled: true,
  debug: process.env.NODE_ENV === 'development',
};

export default SENTRY.SERVER.CONFIG_CONFIG;
