export default {
  basePath: '/panel/extractor',
  async rewrites() {
    return [
      { source: "/api/:path*", destination: "http://46.202.177.106:8000/:path*" },
    ];
  },
};
