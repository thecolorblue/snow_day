import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    // Don't resolve this module on the server.
    if (isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        '@echogarden/espeak-ng-emscripten': false,
      };
    }

    return config;
  },
};

export default nextConfig;
