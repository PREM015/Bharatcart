export const SENTRY.CLIENT.CONFIG_CONFIG = {
  // Add configuration options
  enabled: true,
  debug: process.env.NODE_ENV === 'development',
};

export default SENTRY.CLIENT.CONFIG_CONFIG;
