/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  images: {
    domains: ['images.unsplash.com', 'via.placeholder.com'],
  },
  experimental: {
    // 라우트 그룹 관련 설정을 활성화하여 레이아웃 구조가 정확히 적용되도록 함
    optimizePackageImports: ['@/components'],
    // 앱 라우터 경로 처리 최적화
    serverExternalPackages: [],
  },
};

module.exports = nextConfig; 