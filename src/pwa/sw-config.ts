// Service Worker Configuration
export const SW_CONFIG = {
  cacheName: 'ecommerce-pwa-v1',
  precacheUrls: [
    '/',
    '/offline.html',
    '/manifest.json'
  ],
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/api\./,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'api-cache',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 300
        }
      }
    },
    {
      urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'image-cache',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 2592000
        }
      }
    }
  ]
};
