import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { NormalizedItemSchema, type NormalizedItem, type Source } from "./schema.js";

const CachedSourceSchema = z.object({
  fetchedAt: z.string(),
  items: z.array(NormalizedItemSchema),
});
export type CachedSource = z.infer<typeof CachedSourceSchema>;

// Último resultado bueno de cada fuente, para usarlo cuando la fuente falla o agota su cupo.
export function readCachedSource(dir: string, source: Source): CachedSource | null {
  const file = join(dir, `${source}.json`);
  if (!existsSync(file)) return null;
  const parsed = CachedSourceSchema.safeParse(JSON.parse(readFileSync(file, "utf8")));
  return parsed.success ? parsed.data : null;
}

export function writeCachedSource(dir: string, source: Source, fetchedAt: Date, items: NormalizedItem[]): void {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `${source}.json`), JSON.stringify({ fetchedAt: fetchedAt.toISOString(), items }));
}
