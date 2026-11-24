import type { NextConfig } from "next";

/**
 * GITHUB_PAGES=1 → static export for GitHub Pages (served from /promoradar).
 * Otherwise a normal Next.js server build (local `next start`, or any Node host).
 */
const pages = process.env.GITHUB_PAGES === "1";
// SITE_HOST (repo variable, e.g. promoradar.xyz) = own domain served from the root; unset = github.io/promoradar
const base = pages ? (process.env.SITE_HOST ? "" : "/promoradar") : "";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  output: pages ? "export" : undefined,
  basePath: base || undefined,
  trailingSlash: pages,
  images: { unoptimized: true },
  env: { NEXT_PUBLIC_BASE_PATH: base, NEXT_PUBLIC_STATIC: pages ? "1" : "0" },
  // server build only: "/" → default language (static export uses public/index.html instead)
  ...(pages ? {} : { async redirects() { return [{ source: "/", destination: "/uk", permanent: false }]; } }),
};

export default nextConfig;
