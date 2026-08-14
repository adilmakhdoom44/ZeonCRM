import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The floating dev badge sits over the bottom-left corner of every page, which
  // ends up in documentation screenshots. Nothing is lost by turning it off.
  devIndicators: false,

  // Two lockfiles exist on this machine (one in $HOME), and Next picks the wrong
  // one as the workspace root. Say it explicitly.
  turbopack: { root: __dirname },
};

export default nextConfig;
