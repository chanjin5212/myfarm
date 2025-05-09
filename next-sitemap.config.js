module.exports = {
  siteUrl: 'https://gangwonnongbu.co.kr',
  generateRobotsTxt: true,
  experimental: {
    appDir: true,
  },
  additionalPaths: async (config) => [
    await config.transform(config, '/admin'),
    await config.transform(config, '/admin/dashboard'),
    await config.transform(config, '/admin/products'),
    await config.transform(config, '/admin/products/add'),
    await config.transform(config, '/admin/orders'),
    await config.transform(config, '/admin/reviews'),
    await config.transform(config, '/admin/statistics'),
    await config.transform(config, '/admin/users'),
    await config.transform(config, '/admin/inquiries'),
    await config.transform(config, '/admin/login'),
    await config.transform(config, '/m'),
    await config.transform(config, '/m/products'),
    await config.transform(config, '/m/mypage'),
    await config.transform(config, '/m/mypage/change-password'),
    await config.transform(config, '/m/mypage/edit-profile'),
    // 동적 라우트 예시
    await config.transform(config, '/admin/products/1'),
    await config.transform(config, '/m/products/1'),
    // 필요한 경로 계속 추가
  ],
};