"use client";

import { BrandToggle } from "./BrandToggle";
import { useBrand } from "../lib/brand";

// Selector de marca del radar: guarda la elección para el detalle y el brief.
export function BrandPicker({ profiles }: { profiles: { id: string; nombre: string }[] }) {
  const [brand, setBrand] = useBrand(profiles.map((p) => p.id));
  return <BrandToggle profiles={profiles} value={brand} onChange={setBrand} />;
}
