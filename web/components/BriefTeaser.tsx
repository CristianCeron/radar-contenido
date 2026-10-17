"use client";

import Link from "next/link";
import type { Brief } from "pipeline/schema";
import { BrandToggle } from "./BrandToggle";
import { useBrand } from "../lib/brand";

interface BriefTeaserProps {
  topicId: string;
  profiles: { id: string; nombre: string }[];
  briefs: Record<string, Brief>;
}

// Adelanto del brief del radar de la mañana para la marca elegida, con acceso al brief completo.
export function BriefTeaser({ topicId, profiles, briefs }: BriefTeaserProps) {
  const [brand, setBrand] = useBrand(profiles.map((p) => p.id));
  const brief = briefs[brand];

  return (
    <section data-testid="briefs" className="flex flex-col gap-[18px] rounded-3xl bg-ink p-6 text-white sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-[13px] font-semibold tracking-[.08em] text-accent uppercase">Brief</span>
        <BrandToggle profiles={profiles} value={brand} onChange={setBrand} />
      </div>
      {brief ? (
        <>
          <span className="text-[22px] leading-[1.15] font-semibold tracking-[-0.02em] sm:text-[26px]">“{brief.hook}”</span>
          <span className="text-sm text-soft">{brief.format}</span>
        </>
      ) : (
        <span className="text-soft">El radar de la mañana no dejó un brief para esta marca. Puedes generarlo en vivo.</span>
      )}
      <Link
        href={`/tema/${topicId}/brief?marca=${brand}`}
        className="inline-flex min-h-11 items-center justify-center gap-2 self-stretch rounded-full bg-accent px-[22px] py-3.5 font-semibold text-ink transition-colors hover:bg-accent-hover sm:self-start"
      >
        Ver brief completo
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </Link>
    </section>
  );
}
