/** @type {import('next').NextConfig} */
const isProduction = process.env.NODE_ENV === 'production';
const scriptSrc = isProduction ? "'self' 'unsafe-inline'" : "'self' 'unsafe-inline' 'unsafe-eval'";

const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'img.youtube.com',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "connect-src 'self' https://www.youtube.com https://youtube.com",
              "frame-src 'self' https://www.youtube-nocookie.com https://open.spotify.com https://player.vimeo.com",
              "child-src 'self' https://www.youtube-nocookie.com https://open.spotify.com https://player.vimeo.com",
              "img-src 'self' data: https: blob:",
              "media-src 'self' https: blob:",
              `script-src ${scriptSrc}`,
              "style-src 'self' 'unsafe-inline' https:",
              "font-src 'self' https://fonts.gstatic.com",
            ].join('; '),
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
