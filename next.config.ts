import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prisma's generated client lives outside node_modules (src/generated/prisma),
  // so Next's serverless bundler doesn't always detect the query engine binary
  // via static analysis. Force it to be included in every route's function bundle.
  outputFileTracingIncludes: {
    "/**": ["./src/generated/prisma/**/*"],
  },
};

export default nextConfig;
