"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Topic } from "pipeline/schema";
import { BrandToggle } from "./BrandToggle";
import { saveBrand } from "../lib/brand";
import type { BriefResponse } from "../lib/brief-api";
import { applyResponse, briefText, initialShown, type ShownBrief } from "../lib/brief-state";
import { STAGE_LABEL, formatDateTime } from "../lib/format";

interface BriefViewProps {
  topic: Topic;
  profiles: { id: string; nombre: string }[];
  initialBrand: string;
}

const LABEL = "text-[13px] font-semibold tracking-[.08em] text-muted uppercase";

function Spinner() {
  return (
    <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ff6a2b" strokeWidth="2" aria-hidden="true">
      <path d="M12 3a9 9 0 1 1-9 9" />
    </svg>
  );
}

function Status({ shown, loading }: { shown: ShownBrief; loading: boolean }) {
  if (loading) {
    return (
      <span role="status" className="inline-flex items-center gap-2 text-sm text-accent">
        <Spinner />
        Generando brief en vivo...
      </span>
    );
  }
  if (!shown.brief) return null;
  if (shown.origin === "en_vivo") {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-accent/35 bg-accent/10 px-3 py-1.5 text-sm text-accent">
        <span className="h-[7px] w-[7px] rounded-full bg-accent" />
        Generado en vivo
      </span>
    );
  }
  const fallback = shown.origin === "precalculado";
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm ${
        fallback ? "border-cache/40 bg-cache/12 text-cache" : "border-ink-line bg-ink-3 text-soft"
      }`}
    >
      <span className={`h-[7px] w-[7px] rounded-full ${fallback ? "bg-cache" : "bg-ok"}`} />
      Del radar de la mañana
    </span>
  );
}

// Brief completo para una marca: el del radar diario al entrar y uno nuevo en vivo al cambiar de
// marca o al regenerar. Si el modelo no responde, /api/brief devuelve el de la corrida.
export function BriefView({ topic, profiles, initialBrand }: BriefViewProps) {
  const ids = profiles.map((p) => p.id);
  const [brand, setBrand] = useState(ids.includes(initialBrand) ? initialBrand : ids[0] ?? "");
  const [shown, setShown] = useState(() => initialShown(profiles, topic.briefs));
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(copyTimer.current), []);

  async function generate(id: string) {
    setLoading(true);
    let res: BriefResponse | null = null;
    try {
      const r = await fetch("/api/brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topicId: topic.id, profileId: id }),
      });
      res = (await r.json()) as BriefResponse;
    } catch {
      res = null;
    }
    setShown((s) => ({ ...s, [id]: applyResponse(s[id], res) }));
    setLoading(false);
  }

  function pick(id: string) {
    setBrand(id);
    saveBrand(id);
    window.history.replaceState(null, "", `?marca=${id}`);
    void generate(id);
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  const current = shown[brand] ?? { origin: "corrida" as const };
  const b = current.brief;
  const marca = profiles.find((p) => p.id === brand)?.nombre ?? brand;
  const crumbs = [topic.label, topic.pilar, STAGE_LABEL[topic.stage]].filter(Boolean).join(" · ");

  return (
    <main className="mx-auto flex max-w-[1280px] flex-col gap-7 px-4 pt-8 pb-24 sm:px-8 sm:pt-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2.5">
          <span className="text-sm font-semibold text-muted-2">{crumbs}</span>
          <h1 className="text-[36px] leading-none font-semibold tracking-[-0.035em] sm:text-5xl">
            Brief <span className="serif">listo para producir</span>
          </h1>
        </div>
        <Link
          href={`/tema/${topic.id}`}
          className="inline-flex min-h-11 items-center rounded-full border border-line-2 bg-white px-[18px] py-3 text-[15px] font-medium hover:border-ink"
        >
          Volver al tema
        </Link>
      </div>

      <section className="flex flex-col gap-7 rounded-[28px] bg-ink p-6 text-white sm:p-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <BrandToggle profiles={profiles} value={brand} onChange={pick} disabled={loading} />
          <Status shown={current} loading={loading} />
        </div>

        {loading ? (
          <div aria-busy="true" className="flex flex-col gap-[18px]">
            <div className="sk h-[18px] w-[30%]" />
            <div className="sk h-12 w-[86%]" />
            <div className="sk h-12 w-[60%]" />
            <div className="grid gap-4 md:grid-cols-3">
              <div className="sk h-24" />
              <div className="sk h-24" />
              <div className="sk h-24" />
            </div>
            <span className="text-[13px] text-muted">Tarda unos 10 segundos</span>
          </div>
        ) : b ? (
          <div className="flex flex-col gap-7">
            {current.failed && (
              <p role="status" className="rounded-2xl border border-cache/40 bg-cache/12 px-4 py-3 text-sm text-cache">
                No pudimos generar un brief nuevo para esta marca. Te mostramos el último disponible; puedes intentar de nuevo en unos
                minutos.
              </p>
            )}
            {current.origin === "precalculado" && !current.failed && (
              <p className="text-sm text-soft">El modelo no respondió a tiempo. Ves el brief generado el {formatDateTime(b.generatedAt)}.</p>
            )}
            <div className="flex flex-col gap-2.5">
              <span className={LABEL}>Gancho</span>
              <span className="text-[30px] leading-[1.05] font-semibold tracking-[-0.03em] sm:text-[52px]">“{b.hook}”</span>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="flex flex-col gap-2 rounded-[20px] border border-ink-line-2 bg-ink-2 p-[22px]">
                <span className={LABEL}>Ángulo</span>
                <span className="text-[17px] leading-[1.45]">{b.angle}</span>
              </div>
              <div className="flex flex-col gap-2 rounded-[20px] border border-ink-line-2 bg-ink-2 p-[22px]">
                <span className={LABEL}>Formato</span>
                <span className="text-[17px] leading-[1.45]">{b.format}</span>
              </div>
              <div className="flex flex-col gap-2.5 rounded-[20px] border border-ink-line-2 bg-ink-2 p-[22px]">
                <span className={LABEL}>Oportunidad</span>
                <span className="self-start rounded-full bg-accent px-3 py-1.5 text-sm font-semibold text-ink">{b.opportunity.product}</span>
                {b.opportunity.rationale.trim() && <span className="text-[15px] leading-[1.45] text-soft">{b.opportunity.rationale}</span>}
              </div>
            </div>
          </div>
        ) : (
          <div data-testid="brief-empty" className="flex flex-col gap-2">
            <span className="text-[22px] font-semibold">
              {current.failed ? "No pudimos generar un brief para esta marca." : "Todavía no hay brief para esta marca."}
            </span>
            <span className="text-soft">
              {current.failed ? "Intenta de nuevo en unos minutos." : "El radar diario no dejó uno guardado. Puedes generarlo ahora."}
            </span>
          </div>
        )}

        <div className="flex flex-wrap gap-2.5">
          {b && !loading && (
            <button
              type="button"
              onClick={() => copy(briefText(b, marca, topic.label))}
              className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full bg-accent px-6 py-3.5 text-base font-semibold text-ink transition-colors hover:bg-accent-hover"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
                <rect x="8" y="8" width="12" height="12" rx="2.5" />
                <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
              </svg>
              <span aria-live="polite">{copied ? "Copiado" : "Copiar brief"}</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => generate(brand)}
            disabled={loading}
            className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full bg-white px-6 py-3.5 text-base font-semibold text-ink transition-colors hover:bg-paper disabled:cursor-wait disabled:opacity-60"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
              <path d="M20 11a8 8 0 1 0-2.3 5.7M20 5v6h-6" />
            </svg>
            {b ? "Regenerar" : "Generar brief en vivo"}
          </button>
        </div>
      </section>
    </main>
  );
}
