export default {
  async rewrites() {
    return [
      { source: "/api/:path*", destination: "http://46.202.177.106:8000/:path*" }, // Cambia la IP por la de tu VPS
    ];
  },
};
