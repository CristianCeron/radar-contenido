"use client";

import { useState } from "react";
import type { Brief } from "pipeline/schema";
import type { BriefResponse, BriefSource } from "../lib/brief-api";

interface BriefPanelProps {
  topicId: string;
  profiles: { id: string; nombre: string }[];
  briefs: Record<string, Brief>;
}

type Origin = BriefSource | "corrida";

const ORIGIN_LABEL: Record<Origin, string> = {
  corrida: "De la corrida diaria",
  en_vivo: "Generado en vivo",
  precalculado: "De la corrida diaria (el modelo no respondió a tiempo)",
  sin_brief: "",
};

// Selector de perfil: al cambiar de marca pide el brief en vivo a /api/brief. Si falla, se queda
// con el brief precalculado y lo indica; si no hay ninguno, muestra un mensaje claro.
export function BriefPanel({ topicId, profiles, briefs }: BriefPanelProps) {
  const [profileId, setProfileId] = useState(profiles[0]?.id ?? "");
  const [shown, setShown] = useState<Record<string, { brief?: Brief; origin: Origin }>>(() =>
    Object.fromEntries(profiles.map((p) => [p.id, { brief: briefs[p.id], origin: "corrida" as Origin }])),
  );
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function select(id: string) {
    setProfileId(id);
    setNotice(null);
    setLoading(true);
    try {
      const res = await fetch("/api/brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topicId, profileId: id }),
      });
      const data = (await res.json()) as BriefResponse;
      if (data.brief) setShown((s) => ({ ...s, [id]: { brief: data.brief, origin: data.source } }));
      if (data.source !== "en_vivo" && data.notice) setNotice(data.notice);
    } catch {
      setNotice("No pudimos generar el brief en este momento. Se muestra el último disponible.");
    } finally {
      setLoading(false);
    }
  }

  const current = shown[profileId];
  const b = current?.brief;

  return (
    <div>
      <div role="tablist" aria-label="Marca" className="mb-4 flex flex-wrap gap-2">
        {profiles.map((p) => (
          <button
            key={p.id}
            role="tab"
            aria-selected={p.id === profileId}
            onClick={() => select(p.id)}
            disabled={loading}
            className={`rounded-full border px-3 py-1 text-sm transition-colors ${
              p.id === profileId ? "border-[var(--up)] text-[var(--up)]" : "border-[var(--line)] hover:border-[var(--muted)]"
            }`}
          >
            {p.nombre}
          </button>
        ))}
      </div>

      {loading && <p className="text-sm text-[var(--muted)]">Generando brief en vivo…</p>}
      {notice && <p className="mb-3 text-sm text-amber-300">{notice}</p>}

      {!loading && b && (
        <article>
          <p className="mb-2 text-xs text-[var(--muted)]">{ORIGIN_LABEL[current.origin]}</p>
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-[var(--muted)]">Ángulo</dt>
              <dd>{b.angle}</dd>
            </div>
            <div>
              <dt className="text-[var(--muted)]">Formato</dt>
              <dd>{b.format}</dd>
            </div>
            <div>
              <dt className="text-[var(--muted)]">Gancho</dt>
              <dd>{b.hook}</dd>
            </div>
            <div>
              <dt className="text-[var(--muted)]">Oportunidad</dt>
              <dd>
                {b.opportunity.product}: {b.opportunity.rationale}
              </dd>
            </div>
          </dl>
        </article>
      )}
      {!loading && !b && <p className="text-sm text-[var(--muted)]">No hay brief disponible para este tema.</p>}
    </div>
  );
}
