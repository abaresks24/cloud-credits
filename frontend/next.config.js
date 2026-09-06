/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  webpack: (config) => {
    // The wagmi connectors barrel pulls in the Base/Coinbase/x402 stack we don't use.
    config.resolve.alias = {
      ...config.resolve.alias,
      "@base-org/account": false,
      "@coinbase/cdp-sdk": false,
      "@x402/evm": false,
    };
    return config;
  },
};
