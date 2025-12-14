// craco.config.js
const CompressionPlugin = require("compression-webpack-plugin");

module.exports = {
  style: {
    postcss: {
      plugins: [
        require("tailwindcss"),
        require("autoprefixer"),
      ],
    },
  },
  webpack: {
    plugins: {
      // Add compression plugins only in production
      add: process.env.NODE_ENV === "production" ? [
        // GZIP compression
        new CompressionPlugin({
          filename: "[path][base].gz",
          algorithm: "gzip",
          test: /\.(js|css|html|svg|json)$/,
          threshold: 1024, // Only compress files > 1KB
          minRatio: 0.8,   // Only compress if ratio < 0.8
          deleteOriginalAssets: false, // Keep original files
        }),
      ] : [],
    },
    configure: (webpackConfig) => {
      // Optimize chunk splitting for better caching
      if (process.env.NODE_ENV === "production") {
        webpackConfig.optimization = {
          ...webpackConfig.optimization,
          splitChunks: {
            chunks: "all",
            minSize: 20000,
            maxSize: 244000, // ~244KB chunks for HTTP/2
            cacheGroups: {
              vendor: {
                test: /[\\/]node_modules[\\/]/,
                name: "vendors",
                chunks: "all",
                priority: 10,
              },
              common: {
                name: "common",
                minChunks: 2,
                chunks: "all",
                priority: 5,
                reuseExistingChunk: true,
              },
            },
          },
        };
      }
      return webpackConfig;
    },
  },
};
  