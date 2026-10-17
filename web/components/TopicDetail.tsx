import type { Radar, Topic } from "pipeline/schema";
import { BriefPanel } from "./BriefPanel";
import { GrowthChart } from "./GrowthChart";
import { HOOK_LABEL, SOURCE_LABEL, STAGE_HINT, STAGE_LABEL, formatVelocity } from "../lib/format";

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section data-testid={id} className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">{title}</h2>
      {children}
    </section>
  );
}

const external = { target: "_blank", rel: "noopener noreferrer" } as const;

// Detalle de un tema: curva, quiénes hablan, cómo lo hacen, por qué crece y los briefs por perfil.
// Estructura funcional; el diseño visual final se hace después.
export function TopicDetail({ topic, radar }: { topic: Topic; radar: Radar }) {
  const total = topic.series.reduce((s, p) => s + p.count, 0);
  const rising = (topic.velocity ?? 0) >= 0;

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
      <a href="/" className="text-sm text-[var(--muted)] hover:text-[var(--text)]">
        ← Volver al radar
      </a>

      <header className="mt-4 mb-6">
        <h1 className="text-3xl font-semibold tracking-tight">{topic.label}</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          {topic.pilar && <span className="mr-2 font-medium text-[var(--text)]">Pilar: {topic.pilar} ·</span>}
          {STAGE_LABEL[topic.stage]}: {STAGE_HINT[topic.stage]}
        </p>
        <p className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
          <span className={rising ? "text-[var(--up)]" : "text-[var(--down)]"}>
            {rising ? "▲" : "▼"} {formatVelocity(topic.velocity)} esta semana
          </span>
          <span>{total} menciones en 30 días</span>
          <span>Relevancia para ejecutivos: {Math.round(topic.executiveRelevance * 100)}/100</span>
        </p>
      </header>

      <div className="grid gap-4">
        <Section id="growth" title="Crecimiento en 30 días">
          <GrowthChart series={topic.series} />
        </Section>

        <Section id="why" title="Por qué está creciendo">
          <p className="leading-relaxed">{topic.explanation.text}</p>
          <ul className="mt-4 space-y-1.5 text-sm">
            {topic.explanation.evidence.map((e) => (
              <li key={e.url}>
                <a href={e.url} {...external} className="text-sky-300 underline-offset-2 hover:underline">
                  {e.title}
                </a>
              </li>
            ))}
          </ul>
        </Section>

        <Section id="channels" title="Quiénes hablan de él">
          <ul className="flex flex-wrap gap-2 text-sm">
            {topic.channels.map((c) => (
              <li key={`${c.source}-${c.name}`} className="rounded-full border border-[var(--line)] px-3 py-1">
                {c.url ? (
                  <a href={c.url} {...external} className="hover:underline">
                    {c.name}
                  </a>
                ) : (
                  c.name
                )}{" "}
                <span className="text-[var(--muted)]">
                  {SOURCE_LABEL[c.source]} · {c.count}
                </span>
              </li>
            ))}
          </ul>
        </Section>

        <Section id="pieces" title="Cómo lo cuentan: gancho y formato">
          <ul className="divide-y divide-[var(--line)]">
            {topic.topPieces.map((p) => (
              <li key={p.url} className="py-3 first:pt-0 last:pb-0">
                <a href={p.url} {...external} className="font-medium hover:underline">
                  {p.title}
                </a>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  {p.outlet} · Gancho: {HOOK_LABEL[p.hook]} · Formato: {p.format}
                </p>
                {p.analysis && <p className="mt-1 text-sm">{p.analysis}</p>}
              </li>
            ))}
          </ul>
        </Section>

        <Section id="briefs" title="Qué publicar: brief por marca">
          <BriefPanel topicId={topic.id} profiles={radar.profiles} briefs={topic.briefs} />
        </Section>
      </div>
    </main>
  );
}
