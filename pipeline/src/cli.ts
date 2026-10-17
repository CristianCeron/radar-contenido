import { runPipeline } from "./index.js";

runPipeline().catch((err) => {
  console.error(err);
  process.exit(1);
});
