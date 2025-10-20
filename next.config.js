/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  basePath: process.env.NODE_ENV === 'production' ? '/emoji-match-game' : '',
  // assetPrefix: process.env.NODE_ENV === 'production' ? '/resume/' : '',
}

module.exports = nextConfig