/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.resolve.alias.canvas = false;
    return config;
  },
  headers: async () => [
    {
      source: '/:path*',
      headers: [
        {
          key: 'Cross-Origin-Opener-Policy',
          value: 'same-origin'
        },
        {
          key: 'Cross-Origin-Embedder-Policy',
          value: 'require-corp'
        }
      ]
    }
  ]
};

module.exports = nextConfig;