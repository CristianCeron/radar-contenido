import { config } from "dotenv";
import { fileURLToPath } from "node:url";

config({ path: fileURLToPath(new URL("../../.env", import.meta.url)), quiet: true });

const { runPipeline } = await import("./index.js");

runPipeline()
  .then((r) => process.exit(r.status === "ok" ? 0 : 2))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
