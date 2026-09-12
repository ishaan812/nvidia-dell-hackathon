import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@firecrawl/anydoc", "exceljs", "pdfjs-dist"],
};

export default nextConfig;
