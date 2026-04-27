import { withWorkflow } from "workflow/next";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  serverExternalPackages: [
    "@napi-rs/canvas",
    "pdfjs-dist",
    "@vercel/oidc",
    "@firecrawl/pdf-inspector",
    "@firecrawl/pdf-inspector-linux-x64-gnu",
    "@firecrawl/pdf-inspector-win32-x64-msvc",
    "@firecrawl/pdf-inspector-darwin-arm64"
  ],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.googleusercontent.com",
      },
    ],
  },
};

export default withWorkflow(nextConfig);
