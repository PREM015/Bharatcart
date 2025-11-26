export const SENTRY.EDGE.CONFIG_CONFIG = {
  // Add configuration options
  enabled: true,
  debug: process.env.NODE_ENV === 'development',
};

export default SENTRY.EDGE.CONFIG_CONFIG;
