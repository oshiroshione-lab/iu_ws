import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cloud Run 向けに「実行に必要な最小ファイル一式」を出力する（standalone）。
  output: "standalone",
};

export default nextConfig;
