const { getDefaultConfig } = require("expo/metro-config");
const http = require("http");

const config = getDefaultConfig(__dirname);

config.watchFolders = [];
config.resolver.blockList = [
  /\.local\/state\/.*/,
  /\.local\/skills\/.*/,
  /web\/node_modules\/.*/,
];

config.server = config.server || {};
config.server.enhanceMiddleware = (middleware) => {
  return (req, res, next) => {
    const url = req.url || "";
    if (url.startsWith("/home/") || url.startsWith("/api/portal/") || url.startsWith("/app/assets/")) {
      const proxyReq = http.request(
        {
          hostname: "localhost",
          port: 5000,
          path: url,
          method: req.method,
          headers: { ...req.headers, host: "localhost:5000" },
        },
        (proxyRes) => {
          res.writeHead(proxyRes.statusCode, proxyRes.headers);
          proxyRes.pipe(res, { end: true });
        }
      );
      proxyReq.on("error", () => next());
      req.pipe(proxyReq, { end: true });
      return;
    }
    return middleware(req, res, next);
  };
};

module.exports = config;
