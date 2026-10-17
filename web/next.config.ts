import { resolve } from "node:path";
import { config } from "dotenv";
import type { NextConfig } from "next";

// La web importa el esquema y los briefs del paquete "pipeline" del mismo repositorio.
const root = resolve(process.cwd(), "..");

// En local las claves viven en el .env de la raíz; en Vercel vienen de sus variables de entorno.
config({ path: resolve(root, ".env"), quiet: true });

const nextConfig: NextConfig = {
  transpilePackages: ["pipeline"],
  outputFileTracingRoot: root,
  // El pipeline usa imports ESM con extensión ".js" que apuntan a archivos ".ts".
  webpack: (cfg) => {
    cfg.resolve.extensionAlias = { ".js": [".ts", ".tsx", ".js"] };
    return cfg;
  },
};

export default nextConfig;
