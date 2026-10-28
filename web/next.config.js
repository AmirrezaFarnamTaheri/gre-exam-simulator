/** @type {import('next').NextConfig} */
const nextConfig = {
  // The adaptive engine lives in ../engine as TS source with no build step;
  // this tells Next to transpile it instead of treating it as opaque node_modules.
  transpilePackages: ["gre-adaptive-engine"],
};

module.exports = nextConfig;
