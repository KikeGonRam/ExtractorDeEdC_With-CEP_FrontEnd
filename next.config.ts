export default {
  assetPrefix: '/panel/extractor/',
  async rewrites() {
    return [
      // Route API calls to the nginx-proxied path. Use relative path so
      // the browser keeps the same origin (HTTPS) and nginx forwards to
      // the internal backend at 127.0.0.1:8000.
      { source: "/api/:path*", destination: "/extractor-api/:path*" },
    ];
  },
};