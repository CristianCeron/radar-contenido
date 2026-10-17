import Link from "next/link";
import type { Radar, Topic } from "pipeline/schema";
import { AreaChart } from "./AreaChart";
import { BriefTeaser } from "./BriefTeaser";
import { StageBadge } from "./badges";
import { HOOK_LABEL, SOURCE_LABEL, STAGE_HINT, STAGE_LABEL, formatVelocity, mentions14, splitSerif } from "../lib/format";

const external = { target: "_blank", rel: "noopener noreferrer" } as const;

function Card({ id, title, children, className = "" }: { id: string; title: string; children: React.ReactNode; className?: string }) {
  return (
    <section data-testid={id} className={`flex flex-col gap-5 rounded-3xl bg-white p-6 sm:p-8 ${className}`}>
      <h2 className="text-xl font-semibold tracking-[-0.02em] sm:text-2xl">{title}</h2>
      {children}
    </section>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[13px] text-muted">{label}</span>
      <span className="text-[28px] font-semibold sm:text-4xl">{children}</span>
    </div>
  );
}

function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

// Detalle de un tema: por qué crece, con qué evidencia, quién habla de él, cómo lo cuentan y el
// acceso al brief por marca.
export function TopicDetail({ topic, radar }: { topic: Topic; radar: Radar }) {
  const pos = radar.topics.findIndex((t) => t.id === topic.id) + 1;
  const [before, word, after] = splitSerif(topic.label);
  const up = (topic.velocity ?? 0) >= 0;
  const outlets = new Map(topic.topPieces.map((p) => [p.url, p.outlet]));
  const channels = topic.channels.filter((c) => c.source !== "equipo");
  const team = topic.channels.filter((c) => c.source === "equipo").reduce((s, c) => s + c.count, 0);

  return (
    <main className="mx-auto flex max-w-[1280px] flex-col gap-5 px-4 pt-6 pb-24 sm:px-8 sm:pt-8">
      <Link href="/radar" className="inline-flex min-h-11 items-center gap-2 self-start text-[15px] text-muted-2 hover:text-ink">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
          <path d="M19 12H5M11 6l-6 6 6 6" />
        </svg>
        Volver al radar
      </Link>

      <section className="flex flex-col gap-7 rounded-[28px] bg-ink p-6 text-white sm:p-10">
        <div className="flex flex-wrap items-center gap-2">
          {pos > 0 && <span className="text-[15px] font-semibold text-muted">#{pos}</span>}
          {topic.pilar && (
            <span data-testid="pilar" className="rounded-full bg-accent px-3 py-[5px] text-[13px] font-semibold text-ink">
              {topic.pilar}
            </span>
          )}
          <StageBadge stage={topic.stage} />
        </div>
        <div className="flex flex-wrap items-end justify-between gap-8">
          <h1 className="flex-[1_1_520px] text-[40px] leading-none font-semibold tracking-[-0.035em] sm:text-[64px]">
            {before}
            <span className="serif text-accent">{word}</span>
            {after}
          </h1>
          <div className="flex flex-wrap gap-8 sm:gap-10">
            <Stat label="Semana">
              <span className={topic.velocity === null ? "text-muted" : up ? "text-accent" : "text-[#b4a8ff]"}>
                {topic.velocity === null ? "sin dato" : `${up ? "▲" : "▼"} ${formatVelocity(topic.velocity)}`}
              </span>
            </Stat>
            <Stat label="Menciones 14 d">
              <span>{mentions14(topic.series)}</span>
            </Stat>
            <Stat label="Relevancia">
              <span>{Math.round(topic.executiveRelevance * 100)}</span>
              <span className="text-lg text-muted">/100</span>
            </Stat>
          </div>
        </div>
        <div data-testid="stage-hint" className="flex items-start gap-3 rounded-[18px] border border-ink-line-2 bg-ink-2 px-5 py-4">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ff6a2b" strokeWidth="1.5" aria-hidden="true" className="shrink-0">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 11v5M12 8v.5" />
          </svg>
          <span className="leading-[1.45] text-[#d9d5cb]">
            <b className="text-white">{STAGE_LABEL[topic.stage]}:</b> {STAGE_HINT[topic.stage]}
          </span>
        </div>
      </section>

      <section className="flex flex-col gap-5 rounded-3xl bg-white p-6 sm:p-8">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-lg font-semibold tracking-[-0.02em] sm:text-2xl">Menciones por día, últimos 30 días</h2>
          <span className="text-sm text-muted-2">Un ítem con varias fuentes cuenta una vez por fuente</span>
        </div>
        <AreaChart series={topic.series} />
      </section>

      <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
        <div className="contents lg:flex lg:min-w-0 lg:flex-[999_1_640px] lg:flex-col lg:gap-5">
          <Card id="why" title="Por qué está creciendo" className="order-1 lg:order-none">
            <p className="text-[17px] leading-[1.55] text-[#26241f] sm:text-[19px]">{topic.explanation.text}</p>
            {topic.explanation.evidence.length > 0 && (
              <div className="flex flex-col gap-2.5">
                <span className="text-[13px] font-semibold tracking-[.06em] text-muted-2 uppercase">Evidencia</span>
                {topic.explanation.evidence.map((e) => (
                  <a
                    key={e.url}
                    href={e.url}
                    {...external}
                    className="flex items-center justify-between gap-4 rounded-2xl border border-line px-[18px] py-4 transition-colors hover:border-ink"
                  >
                    <span className="flex min-w-0 flex-col gap-1">
                      <span className="leading-[1.35] font-semibold">{e.title}</span>
                      <span className="text-[13px] text-muted-2">{outlets.get(e.url) ?? hostname(e.url)}</span>
                    </span>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0a0a0a" strokeWidth="1.5" aria-hidden="true" className="shrink-0">
                      <path d="M7 17L17 7M9 7h8v8" />
                    </svg>
                  </a>
                ))}
              </div>
            )}
          </Card>

          <Card id="pieces" title="Cómo lo cuentan" className="order-3 lg:order-none">
            <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-3">
              {topic.topPieces.map((p) => (
                <div key={p.url} className="flex flex-col gap-3.5 rounded-[20px] bg-paper p-5 sm:p-[22px]">
                  <a href={p.url} {...external} className="leading-[1.35] font-semibold hover:underline">
                    {p.title}
                  </a>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="rounded-full bg-accent px-2.5 py-1 text-xs font-semibold">Gancho: {HOOK_LABEL[p.hook]}</span>
                    <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium">{p.format}</span>
                  </div>
                  <span className="text-[13px] text-muted-2">{p.outlet}</span>
                  {p.analysis && <span className="text-[15px] leading-[1.45] text-[#5c574d]">{p.analysis}</span>}
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="contents lg:flex lg:min-w-0 lg:flex-[1_1_360px] lg:flex-col lg:gap-5">
          <section data-testid="channels" className="order-2 flex flex-col gap-4 rounded-3xl bg-white p-6 sm:p-7 lg:order-none">
            <h2 className="text-xl font-semibold tracking-[-0.02em] sm:text-[22px]">Quiénes hablan de él</h2>
            <ul className="flex flex-wrap gap-2">
              {channels.map((c) => {
                const body = (
                  <>
                    <span className="font-semibold">{c.name}</span>
                    {SOURCE_LABEL[c.source] !== c.name && <span className="text-muted-2">{SOURCE_LABEL[c.source]}</span>}
                    <span className="rounded-full bg-ink px-2 py-px text-xs font-semibold text-white">{c.count}</span>
                  </>
                );
                const cls = "inline-flex items-center gap-2 rounded-full bg-paper px-3 py-2 text-sm";
                return (
                  <li key={`${c.source}-${c.name}`}>
                    {c.url ? (
                      <a href={c.url} {...external} className={`${cls} hover:bg-line`}>
                        {body}
                      </a>
                    ) : (
                      <span className={cls}>{body}</span>
                    )}
                  </li>
                );
              })}
              {team > 0 && (
                <li
                  data-testid="team-chip"
                  className="inline-flex items-center gap-2 rounded-full border-[1.5px] border-dashed border-accent-hover bg-[#fff3ec] px-3 py-2 text-sm"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9a3300" strokeWidth="1.75" aria-hidden="true">
                    <circle cx="12" cy="8" r="3.5" />
                    <path d="M5 20a7 7 0 0 1 14 0" />
                  </svg>
                  <span className="font-semibold text-up-text">Aportes del equipo</span>
                  <span className="text-up-text">{team}</span>
                </li>
              )}
            </ul>
            {team > 0 && (
              <span className="text-[13px] text-muted-2">Los aportes del equipo nunca muestran el nombre ni el enlace de quien publicó.</span>
            )}
          </section>

          <div className="order-4 lg:order-none">
            <BriefTeaser topicId={topic.id} profiles={radar.profiles} briefs={topic.briefs} />
          </div>
        </div>
      </div>
    </main>
  );
}
