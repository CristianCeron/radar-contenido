import { resolve } from "node:path";
import type { NextConfig } from "next";

// La web importa el esquema y los briefs del paquete "pipeline" del mismo repositorio.
const root = resolve(process.cwd(), "..");

const nextConfig: NextConfig = {
  transpilePackages: ["pipeline"],
  outputFileTracingRoot: root,
  turbopack: { root },
};

export default nextConfig;
