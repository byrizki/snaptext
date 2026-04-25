import { withWorkflow } from "workflow/next";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  serverExternalPackages: ['@napi-rs/canvas', 'pdfjs-dist', '@vercel/oidc']
};

export default withWorkflow(nextConfig);
