import { ProfileSchema, type Profile } from "pipeline/brief";
import p30x from "pipeline/perfiles/30x.json";
import pAndres from "pipeline/perfiles/andres-bilbao.json";

// Perfiles de marca que usa el brief en vivo. Son los mismos archivos que usa el pipeline.
export const PROFILES: Profile[] = [p30x, pAndres].map((p) => ProfileSchema.parse(p));
