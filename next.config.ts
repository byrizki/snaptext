import { withWorkflow } from "workflow/next";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  serverExternalPackages: [
    "@napi-rs/canvas",
    "pdfjs-dist",
    "@vercel/oidc",
  ],
  outputFileTracingIncludes: {
    "**": [
      "./node_modules/.pnpm/pdfjs-dist@*/node_modules/pdfjs-dist/build/pdf.worker.mjs",
      "./node_modules/.pnpm/pdfjs-dist@*/node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs",
    ],
  },
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
