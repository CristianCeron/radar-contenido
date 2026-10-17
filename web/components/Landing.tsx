import Link from "next/link";
import type { Radar, Stage } from "pipeline/schema";
import { PILARES } from "../lib/pilares";
import { SOURCE_LABEL, STAGE_LABEL, formatDay, formatUsd, formatVelocity } from "../lib/format";
import { calloutPosition, highlightTopics, latamDots, noiseBars, radarBlips } from "../lib/landing";

const SENSOR_FORM = "https://docs.google.com/forms/d/e/1FAIpQLSehFGUxekxuljgYgcL7jlAKifhhVffUJs7zl6C-zHaR2vw0Bw/viewform";

const PILAR_ICON: Record<string, string> = {
  "Liderazgo y mentalidad": "M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.4 6.8 19.1l1-5.8L3.5 9.2l5.9-.9z",
  Growth: "M4 20h16M7 16V12M12 16V8M17 16V4",
  "Equipos y talento": "M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 6.5M18.5 14a6.5 6.5 0 0 1 3 6",
  Ventas: "M3 12l4-4 4 4 4-4 6 6M15 14h6v-6",
  Marketing: "M3 10v4l11 5V5zM14 8.5a4 4 0 0 1 0 7M6 14.5l1.5 5h3l-1.3-4",
  "Expansión internacional":
    "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3c2.5 2.5 3.8 5.5 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.5-3.8-9S9.5 5.5 12 3z",
  Fundraising: "M12 3v18M16.5 7H10a3 3 0 0 0 0 6h4a3 3 0 0 1 0 6H7",
  "IA aplicada al negocio": "M8 8h8v8H8zM10 3v3M14 3v3M10 18v3M14 18v3M3 10h3M3 14h3M18 10h3M18 14h3",
};

const DOTS = latamDots(2.1);
const NOISE = noiseBars(34, 7);

const pill = "self-start rounded-full bg-accent px-3 py-1.5 text-[13px] font-semibold text-ink";
const h2 = "m-0 text-[36px] leading-[1.02] font-semibold tracking-[-0.03em] sm:text-[clamp(40px,4.4vw,64px)]";
const moment = "m-0 text-2xl leading-[1.15] font-semibold tracking-[-0.02em] sm:text-[36px] sm:leading-[1.12]";
const wrap = "mx-auto max-w-[1280px] px-4 sm:px-8";

function Arrow() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function blipColor(stage: Stage, hot: boolean): string {
  if (stage === "saturado") return "bg-fail";
  return hot ? "bg-accent" : "bg-white";
}

// Radar decorativo del hero: mapa de puntos de Latinoamérica, anillos por etapa y un punto por tema
// real del radar. Todo va en porcentaje para que escale del celular al escritorio.
function HeroRadar({ radar }: { radar: Radar }) {
  const blips = radarBlips(radar.topics);
  const top = highlightTopics(radar.topics)[0];
  const callout = top ? calloutPosition(blips[radar.topics.indexOf(top)]) : null;
  const rings = [89.3, 67.9, 46.4, 25];
  const labels: [Stage, number][] = [["emergente", 6.4], ["creciendo", 17.1], ["pico", 27.9], ["saturado", 38.6]];
  return (
    <div
      role="img"
      aria-label={`Radar sobre un mapa de Latinoamérica hecho de puntos, con los ${radar.topics.length} temas ubicados por etapa`}
      className="relative aspect-square w-full max-w-[560px]"
    >
      {DOTS.map((d, i) => (
        <span
          key={i}
          className="absolute h-[2px] w-[2px] rounded-full bg-white/25 sm:h-[3px] sm:w-[3px] sm:bg-white/[.22]"
          style={{ left: `${d.x.toFixed(2)}%`, top: `${d.y.toFixed(2)}%` }}
        />
      ))}
      {rings.map((r) => (
        <div
          key={r}
          className="absolute rounded-full border border-accent/20"
          style={{ left: `${(100 - r) / 2}%`, top: `${(100 - r) / 2}%`, width: `${r}%`, height: `${r}%` }}
        />
      ))}
      <div className="absolute top-[5.36%] left-1/2 h-[89.3%] w-px bg-accent/10" />
      <div className="absolute top-1/2 left-[5.36%] h-px w-[89.3%] bg-accent/10" />
      <div
        className="radar-sweep absolute top-[5.36%] left-[5.36%] h-[89.3%] w-[89.3%] rounded-full"
        style={{
          background:
            "conic-gradient(from 0deg, rgba(255,106,43,0) 0deg, rgba(255,106,43,0) 300deg, rgba(255,106,43,.22) 358deg, rgba(255,106,43,.55) 360deg)",
        }}
      />
      {labels.map(([s, top]) => (
        <span
          key={s}
          className="absolute right-[51%] hidden text-[11px] tracking-[.06em] text-muted uppercase sm:block"
          style={{ top: `${top}%` }}
        >
          {STAGE_LABEL[s]}
        </span>
      ))}
      {blips.map((b, i) => (
        <span
          key={i}
          data-testid="blip"
          className={`absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full sm:h-3 sm:w-3 ${blipColor(b.stage, b.hot)} ${
            b.hot ? "radar-ping" : ""
          }`}
          style={{ left: `${b.x.toFixed(2)}%`, top: `${b.y.toFixed(2)}%` }}
        />
      ))}
      {top && callout && (
        <div
          className="absolute hidden flex-col gap-0.5 rounded-[14px] bg-white px-3.5 whitespace-nowrap py-2.5 text-[13px] text-ink shadow-[0_10px_30px_rgba(0,0,0,.4)] sm:flex"
          style={{
            top: `${callout.top.toFixed(2)}%`,
            left: callout.left === undefined ? undefined : `${callout.left.toFixed(2)}%`,
            right: callout.right === undefined ? undefined : `${callout.right.toFixed(2)}%`,
          }}
        >
          <span className="font-semibold">{top.label}</span>
          <span className="font-semibold text-[#c2410c]">
            {(top.velocity ?? 0) >= 0 ? "▲" : "▼"} {formatVelocity(top.velocity)} · {STAGE_LABEL[top.stage]}
          </span>
        </div>
      )}
    </div>
  );
}

function Hero({ radar }: { radar: Radar }) {
  return (
    <section id="inicio" className="overflow-hidden bg-ink text-white">
      <div className={`${wrap} flex flex-wrap items-center gap-8 pt-7 sm:gap-12 sm:pt-[72px] sm:pb-14`}>
        <div className="flex min-w-0 flex-[1_1_520px] flex-col gap-[22px] sm:gap-7">
          <span className="inline-flex items-center gap-2.5 self-start rounded-full border border-accent/35 bg-accent/12 px-3 py-[7px] text-xs font-medium text-accent sm:px-3.5 sm:py-2 sm:text-sm">
            <span className="radar-ping h-[7px] w-[7px] rounded-full bg-accent" />
            Datos del {formatDay(radar.generatedAt)} · Costo de la corrida: {formatUsd(radar.cost.totalUsd)}
          </span>
          <h1 className="m-0 text-[44px] leading-none font-semibold tracking-[-0.035em] sm:text-[clamp(48px,5.6vw,84px)] sm:leading-[0.98]">
            <span className="block">
              Lo que está <span className="serif text-accent">despegando</span> para
            </span>
            <span className="block text-accent">escalar empresas</span>
            <span className="block text-muted">esta semana</span>
          </h1>
          <p className="m-0 max-w-[520px] text-[17px] leading-[1.45] text-soft sm:text-xl">
            {radar.topics.length} temas, con su evidencia y un brief listo para 30X y Andrés Bilbao.
          </p>
          <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:gap-3">
            <Link
              href="/radar"
              className="inline-flex items-center justify-center gap-2.5 rounded-full bg-accent px-7 py-4 text-[17px] font-semibold text-ink transition-colors hover:bg-accent-hover"
            >
              Ver el radar
              <Arrow />
            </Link>
            <a
              href="#como-funciona"
              className="inline-flex items-center justify-center rounded-full bg-white px-7 py-4 text-[17px] font-semibold text-ink transition-colors hover:bg-[#edebe5]"
            >
              Cómo funciona
            </a>
          </div>
        </div>
        <div className="flex min-w-0 flex-[0_1_560px] justify-center">
          <HeroRadar radar={radar} />
        </div>
      </div>

      <div className="border-t border-[#1f1f1d]">
        <div className={`${wrap} flex flex-col gap-3 py-5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-10 sm:gap-y-5 sm:py-7`}>
          <span className="text-xs tracking-[.08em] text-muted uppercase sm:text-[13px]">Solo fuentes oficiales</span>
          <div className="flex flex-wrap items-baseline sm:flex-[1_1_600px] gap-x-5 gap-y-2.5 sm:gap-x-10 sm:gap-y-4">
            {radar.sources.map((s) => (
              <span
                key={s.source}
                className={`text-base font-semibold sm:text-xl ${s.source === "equipo" ? "text-accent" : "text-line-2"}`}
              >
                {SOURCE_LABEL[s.source]} <span className="text-xs font-medium text-muted sm:text-[13px]">{s.items}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Check({ ok }: { ok: boolean }) {
  return ok ? (
    <svg className="shrink-0" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ff6a2b" strokeWidth="1.75" aria-hidden="true">
      <path d="M5 12.5l4.5 4.5L19 7" />
    </svg>
  ) : (
    <svg className="shrink-0" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#868073" strokeWidth="1.5" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

const ANTES = [
  "Miles de publicaciones sin contexto",
  "No explica por qué algo funcionó",
  "No dice si le sirve a founders y ejecutivos",
  "Scraping de redes en zona gris legal",
];

function Historia({ radar }: { radar: Radar }) {
  const highlights = highlightTopics(radar.topics);
  const conRadar = [
    `${radar.topics.length} temas por semana, cada uno con su etapa`,
    "Por qué crece, con evidencia enlazada",
    `Filtrado por los ${PILARES.length} pilares de la Inmersión`,
    "Solo fuentes oficiales y un sensor humano",
  ];
  return (
    <section id="historia" className="bg-paper">
      <div className={`${wrap} flex flex-col gap-10 py-16 sm:gap-24 sm:py-[120px]`}>
        <div className="flex max-w-[820px] flex-col gap-3.5 sm:gap-[18px]">
          <span className={pill}>El problema</span>
          <h2 className={h2}>
            <span className="sm:block">Más datos no es </span>
            <span className="text-muted sm:block">
              saber qué <span className="serif text-ink">publicar</span>
            </span>
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-6 sm:gap-12">
          <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-2.5 sm:gap-3.5">
            <span className="text-[13px] font-semibold text-muted sm:text-sm">01</span>
            <p className={moment}>Cada lunes el equipo decide de qué hablar.</p>
          </div>
          <div className="hidden min-w-0 flex-[1_1_480px] flex-col gap-[18px] rounded-3xl bg-white p-8 sm:flex">
            <div className="flex items-center justify-between">
              <span className="text-[17px] font-semibold">Reunión de contenido</span>
              <span className="rounded-full bg-paper px-3 py-1.5 text-[13px] text-[#5c574d]">Lunes · 9:00 a. m.</span>
            </div>
            <div className="flex flex-col gap-2.5">
              {["¿De qué hablamos esta semana?", "¿Esto le sirve a founders y ejecutivos?", "¿Llegamos tarde a la conversación?"].map((q) => (
                <div key={q} className="rounded-[14px] border border-dashed border-line-2 px-4 py-3.5 text-[#5c574d]">
                  {q}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap-reverse items-center gap-3.5 sm:gap-12">
          <div className="flex min-w-0 flex-[1_1_480px] flex-col gap-3 rounded-[20px] bg-white p-0 sm:rounded-3xl sm:p-6">
            <div role="img" aria-label="Cientos de publicaciones sueltas y desordenadas" className="relative h-[180px] overflow-hidden sm:h-[340px]">
              {NOISE.map((n, i) => (
                <span
                  key={i}
                  className="absolute h-2 rounded-md bg-line-2 sm:h-2.5"
                  style={{
                    left: `${n.left.toFixed(1)}%`,
                    top: `${n.top.toFixed(1)}%`,
                    width: `${n.width.toFixed(0)}px`,
                    transform: `rotate(${n.rotate.toFixed(0)}deg)`,
                    opacity: Number(n.opacity.toFixed(2)),
                  }}
                />
              ))}
            </div>
            <span className="hidden text-[13px] text-muted sm:block">Miles de publicaciones. Ningún porqué.</span>
          </div>
          <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-2.5 sm:gap-3.5">
            <span className="text-[13px] font-semibold text-muted sm:text-sm">02</span>
            <p className={moment}>
              Las herramientas de scraping traen miles de publicaciones,{" "}
              <span className="text-muted">pero no dicen por qué algo funcionó ni si le sirve a tu audiencia.</span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3.5 sm:gap-12">
          <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-2.5 sm:gap-3.5">
            <span className="text-[13px] font-semibold text-muted sm:text-sm">03</span>
            <p className={moment}>
              El radar lo ordena: <span className="text-muted">qué crece, en qué etapa va, por qué, y qué publicar.</span>
            </p>
          </div>
          <div className="flex min-w-0 flex-[1_1_480px] flex-wrap items-center gap-6 rounded-[20px] bg-ink p-5 text-white sm:rounded-3xl sm:p-7">
            <div role="img" aria-label="Las mismas publicaciones, ordenadas en los anillos del radar" className="relative hidden h-[200px] w-[200px] flex-[0_0_200px] sm:block">
              {[0, 30, 60, 85].map((inset) => (
                <div key={inset} className="absolute rounded-full border border-accent/25" style={{ inset }} />
              ))}
              {radarBlips(radar.topics).map((b, i) => (
                <span
                  key={i}
                  className={`absolute h-[9px] w-[9px] -translate-x-1/2 -translate-y-1/2 rounded-full ${blipColor(b.stage, b.hot)}`}
                  style={{ left: `${b.x.toFixed(2)}%`, top: `${b.y.toFixed(2)}%` }}
                />
              ))}
            </div>
            <div className="flex flex-[1_1_200px] flex-col gap-2.5 text-sm">
              {highlights.map((t, i) => {
                const up = (t.velocity ?? 0) >= 0;
                return (
                  <div
                    key={t.id}
                    className={`flex justify-between gap-2 ${i < highlights.length - 1 ? "border-b border-ink-line-2 pb-2.5" : ""}`}
                  >
                    <span>{t.label}</span>
                    <span className={`shrink-0 font-semibold ${up ? "text-accent" : "text-fail"}`}>{formatVelocity(t.velocity)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[repeat(auto-fit,minmax(320px,1fr))] sm:gap-5">
          <div className="flex flex-col gap-3 rounded-[20px] bg-white p-6 sm:gap-[22px] sm:rounded-3xl sm:p-10">
            <span className="text-xs font-semibold tracking-[.08em] text-muted uppercase sm:text-sm">Antes</span>
            <ul className="m-0 flex list-none flex-col gap-3 p-0 text-base text-body sm:gap-4 sm:text-lg">
              {ANTES.map((a) => (
                <li key={a} className="flex gap-3">
                  <Check ok={false} />
                  <span>{a}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col gap-3 rounded-[20px] bg-ink p-6 text-white sm:gap-[22px] sm:rounded-3xl sm:p-10">
            <span className="text-xs font-semibold tracking-[.08em] text-accent uppercase sm:text-sm">Con el radar</span>
            <ul className="m-0 flex list-none flex-col gap-3 p-0 text-base sm:gap-4 sm:text-lg">
              {conRadar.map((a) => (
                <li key={a} className="flex gap-3">
                  <Check ok />
                  <span>{a}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

const ETAPAS: { stage: Stage; color: string; hint: string }[] = [
  { stage: "emergente", color: "bg-accent", hint: "Solo en el origen" },
  { stage: "creciendo", color: "bg-[#ffa77d]", hint: "Llega a la difusión" },
  { stage: "pico", color: "bg-ink", hint: "Llega a la audiencia ejecutiva" },
  { stage: "saturado", color: "bg-fail", hint: "En la prensa y cayendo" },
];

const CAPAS = [
  {
    n: 1,
    name: "Origen",
    stage: "Emergente",
    dot: "bg-accent",
    text: "Foros de founders, newsletters de expertos e investigación.",
    icon: "M12 9.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM7.5 7.5a6.4 6.4 0 0 0 0 9M16.5 7.5a6.4 6.4 0 0 1 0 9M4.6 4.6a10.5 10.5 0 0 0 0 14.8M19.4 4.6a10.5 10.5 0 0 1 0 14.8",
  },
  {
    n: 2,
    name: "Difusión",
    stage: "Creciendo",
    dot: "bg-[#ffa77d]",
    text: "YouTube en español, donde los temas se explican y se masifican.",
    icon: "M6 5.5h12a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3v-7a3 3 0 0 1 3-3zM10.5 9.5v5l4-2.5z",
  },
  {
    n: 3,
    name: "Audiencia ejecutiva",
    stage: "Pico y saturado",
    dot: "bg-ink",
    text: "Prensa de negocios de Latinoamérica y consultoras.",
    icon: "M5 4.5h11.5v15H6.5A1.5 1.5 0 0 1 5 18zM16.5 8.5H19v9.5a1.5 1.5 0 0 1-3 0M8 8h5.5M8 11.5h5.5M8 15h3.5",
  },
];

function ComoFunciona() {
  return (
    <section id="como-funciona" className="scroll-mt-4 bg-paper-2">
      <div className={`${wrap} flex flex-col gap-7 py-16 sm:gap-14 sm:py-[120px]`}>
        <div className="flex max-w-[860px] flex-col gap-3.5 sm:gap-[18px]">
          <span className={pill}>Cómo funciona</span>
          <h2 className={h2}>
            <span className="sm:block">El viaje de un tema </span>
            <span className="text-muted sm:block">
              de los foros a la <span className="serif text-ink">prensa</span>
            </span>
          </h2>
        </div>

        <div className="flex flex-col gap-7 sm:rounded-3xl sm:border sm:border-line sm:bg-white sm:p-10">
          <div className="hidden grid-cols-4 gap-2 sm:grid">
            {ETAPAS.map((e) => (
              <div key={e.stage} className="flex flex-col gap-2">
                <span className={`h-2 rounded-full ${e.color}`} />
                <span className="font-semibold">{STAGE_LABEL[e.stage]}</span>
                <span className="text-[13px] text-muted">{e.hint}</span>
              </div>
            ))}
          </div>

          <ol className="m-0 ml-2 flex list-none flex-col border-l-2 border-line p-0 sm:hidden">
            {CAPAS.map((c, i) => (
              <li key={c.n} className={`relative flex flex-col gap-1.5 pl-6 ${i < CAPAS.length - 1 ? "pb-6" : "pb-1"}`}>
                <span className={`absolute top-0.5 -left-[9px] h-4 w-4 rounded-full ${c.dot}`} />
                <span className="text-xs font-semibold text-muted uppercase">
                  Capa {c.n} · {c.stage}
                </span>
                <span className="text-xl font-semibold">{c.name}</span>
                <span className="text-[15px] leading-[1.4] text-[#5c574d]">{c.text}</span>
              </li>
            ))}
          </ol>

          <div className="hidden grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4 sm:grid">
            {CAPAS.map((c) => (
              <div key={c.n} className="flex flex-col gap-3 rounded-[20px] bg-paper p-6">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0a0a0a" strokeWidth="1.25" aria-hidden="true">
                  <path d={c.icon} />
                </svg>
                <span className="text-[13px] font-semibold text-muted">CAPA {c.n}</span>
                <span className="text-[22px] font-semibold">{c.name}</span>
                <span className="leading-[1.45] text-[#5c574d]">{c.text}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-4 rounded-[20px] bg-ink px-5 py-5 text-white sm:px-7 sm:py-[22px]">
            <svg className="hidden sm:block" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#ff6a2b" strokeWidth="1.5" aria-hidden="true">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            </svg>
            <span className="text-[17px] leading-[1.4] font-medium sm:text-xl">
              La etapa te dice cuándo publicar: <span className="text-accent">lo valioso es llegar antes del pico.</span>
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-4 sm:gap-6">
          <div className="flex flex-wrap items-end justify-between gap-4 sm:gap-6">
            <h3 className="m-0 text-[26px] font-semibold tracking-[-0.02em] sm:text-[36px]">
              Los {PILARES.length} pilares <span className="text-muted">de la Inmersión 30X</span>
            </h3>
            <span className="max-w-[420px] text-[15px] leading-[1.45] text-[#5c574d] sm:text-base">
              Máximo dos temas por pilar, para que la IA de la que todos hablan no se coma el ranking.
            </span>
          </div>
          <ul className="m-0 grid list-none grid-cols-2 gap-2.5 p-0 sm:grid-cols-[repeat(auto-fit,minmax(240px,1fr))] sm:gap-4">
            {PILARES.map((p) => (
              <li
                key={p}
                className="flex min-h-24 flex-col gap-[18px] rounded-[18px] border border-line bg-white p-4 transition-colors hover:border-ink sm:min-h-[120px] sm:gap-7 sm:rounded-[20px] sm:p-6"
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0a0a0a" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d={PILAR_ICON[p] ?? ""} />
                </svg>
                <span className="text-[15px] leading-[1.2] font-semibold sm:text-[19px]">{p}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

const IA = [
  { text: "La velocidad y la etapa son matemáticas", icon: "M4 19h16M6 15l4-4 3 3 5-6" },
  {
    text: "Un modelo rápido clasifica miles de piezas, uno mejor redacta",
    icon: "M5.5 5h3a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zM15.5 5h3a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zM6 9h2M6 12h2M6 15h2M16 9h2.5M16 12h2.5",
  },
  {
    text: "Las explicaciones solo citan evidencia real",
    icon: "M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1",
  },
];

function IaConIntencion() {
  return (
    <section className="bg-ink text-white">
      <div className={`${wrap} flex flex-col gap-6 py-16 sm:gap-12 sm:py-[120px]`}>
        <h2 className={h2}>
          <span className="sm:block">
            IA con <span className="serif text-accent">intención</span>{" "}
          </span>
          <span className="text-muted sm:block">solo donde aporta</span>
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[repeat(auto-fit,minmax(300px,1fr))]">
          {IA.map((c) => (
            <div key={c.text} className="flex flex-col gap-10 rounded-[20px] border border-ink-line-2 bg-ink-2 p-[22px] sm:rounded-3xl sm:p-8">
              <svg className="hidden sm:block" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#ff6a2b" strokeWidth="1.25" aria-hidden="true">
                <path d={c.icon} />
              </svg>
              <span className="text-[19px] leading-[1.25] font-semibold sm:text-2xl sm:leading-[1.2]">{c.text}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Campos del formulario de Google del sensor. Con ellos el formulario de la página abre Google Forms
// con lo que la persona escribió ya puesto; el envío se confirma allá.
const SENSOR_LINK_FIELD = "entry.862709636";
const SENSOR_DESC_FIELD = "entry.489513849";

const field =
  "rounded-[14px] border border-line-2 bg-paper-2 px-4 py-3.5 text-[15px] text-ink outline-none placeholder:text-muted focus:border-ink";

function Sensor() {
  return (
    <section className="bg-paper">
      <div className={`${wrap} flex flex-wrap items-center gap-12 py-16 sm:py-[120px]`}>
        <div className="flex min-w-0 flex-[1_1_480px] flex-col gap-[18px] sm:gap-[22px]">
          <span className={pill}>Sensor humano</span>
          <h2 className="m-0 text-[30px] leading-[1.05] font-semibold tracking-[-0.03em] sm:text-[clamp(36px,3.6vw,52px)] sm:leading-[1.04]">
            Lo que el equipo ve en LinkedIn o TikTok <span className="text-muted">lo pega en un formulario desde el celular.</span>
          </h2>
          <p className="m-0 text-base leading-[1.45] text-[#5c574d] sm:text-[19px]">Sin scraping y sin publicar el nombre de nadie.</p>
          <a
            href={SENSOR_FORM}
            target="_blank"
            rel="noreferrer"
            className="rounded-full bg-ink px-7 py-4 text-center text-[17px] font-semibold text-accent transition-colors hover:bg-ink-3 sm:self-start"
          >
            Reportar una publicación
          </a>
        </div>
        <form
          action={SENSOR_FORM}
          method="get"
          target="_blank"
          aria-labelledby="sensor-titulo"
          className="hidden min-w-0 flex-[0_1_380px] flex-col gap-[18px] rounded-[32px] bg-white p-7 shadow-[0_24px_60px_rgba(10,10,10,.08)] sm:flex"
        >
          <span id="sensor-titulo" className="text-lg font-semibold">
            Reportar una publicación
          </span>
          <input type="hidden" name="usp" value="pp_url" />
          <div className="flex flex-col gap-1.5">
            <label htmlFor="sensor-link" className="text-sm font-medium">
              Enlace de la publicación
            </label>
            <input id="sensor-link" name={SENSOR_LINK_FIELD} type="url" required placeholder="https://www.linkedin.com/posts/..." className={field} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="sensor-desc" className="text-sm font-medium">
              ¿De qué trata? (opcional)
            </label>
            <input id="sensor-desc" name={SENSOR_DESC_FIELD} type="text" placeholder="Ej.: cómo armar un equipo de ventas" className={field} />
          </div>
          <button
            type="submit"
            className="cursor-pointer rounded-full border-0 bg-accent p-3.5 text-base font-semibold text-ink transition-colors hover:bg-accent-hover"
          >
            Enviar
          </button>
          <span className="text-[13px] text-muted-2">
            Se abre Google Forms con tus datos para confirmar. No guardamos tu correo y el enlace solo se usa para no contar dos veces lo
            mismo.
          </span>
        </form>
      </div>
    </section>
  );
}

function Impacto({ radar }: { radar: Radar }) {
  const unit = "text-xl text-muted sm:text-[32px]";
  const cifras = [
    { value: <>{PILARES.length}</>, label: "pilares de la Inmersión", accent: true },
    { value: <>{radar.topics.length}</>, label: "temas por semana con evidencia" },
    {
      value: (
        <>
          {radar.cost.totalUsd < 1 ? "<1" : radar.cost.totalUsd.toLocaleString("es-CO", { maximumFractionDigits: 2 })}
          <span className={unit}> USD</span>
        </>
      ),
      label: "por día de operación",
    },
    { value: <>0</>, label: "scraping: solo fuentes oficiales" },
    {
      value: (
        <>
          5:00<span className={unit}> a. m.</span>
        </>
      ),
      label: "se actualiza solo, cada día",
    },
  ];
  return (
    <section id="impacto" className="bg-ink text-white">
      <div className={`${wrap} flex flex-col gap-7 py-16 sm:gap-14 sm:py-[120px]`}>
        <h2 className={h2}>
          <span className="sm:block">El impacto </span>
          <span className="text-muted sm:block">
            en <span className="serif text-accent">cifras</span>
          </span>
        </h2>
        <dl className="m-0 grid grid-cols-2 gap-x-4 gap-y-7 border-t border-ink-line-2 pt-7 sm:grid-cols-[repeat(auto-fit,minmax(220px,1fr))] sm:gap-x-6 sm:gap-y-10 sm:pt-10">
          {cifras.map((c) => (
            <div key={c.label} className="flex flex-col-reverse justify-end gap-1.5 sm:gap-2.5">
              <dt className="text-sm text-soft sm:text-[17px]">{c.label}</dt>
              <dd className={`m-0 text-5xl leading-none font-semibold tracking-[-0.04em] sm:text-7xl ${c.accent ? "text-accent" : ""}`}>
                {c.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

function Cierre() {
  return (
    <section className="bg-accent text-ink">
      <div className={`${wrap} flex flex-col items-center gap-6 py-16 text-center sm:gap-8 sm:py-28`}>
        <h2 className="m-0 text-[38px] leading-[1.02] font-semibold tracking-[-0.035em] sm:text-[clamp(44px,5vw,76px)] sm:leading-none">
          <span className="sm:block">Sabe qué publicar esta semana, </span>
          <span className="serif sm:block">y por qué</span>
        </h2>
        <Link
          href="/radar"
          className="w-full rounded-full bg-ink px-8 py-4 text-[17px] font-semibold text-accent transition-colors hover:bg-ink-3 sm:w-auto sm:py-[18px] sm:text-lg"
        >
          Ver el radar
        </Link>
      </div>
    </section>
  );
}

// Landing: cuenta el problema, cómo funciona el radar y lleva a /radar. Las cifras salen del
// radar.json de la última corrida, nunca de valores fijos.
export function Landing({ radar }: { radar: Radar }) {
  return (
    <main>
      <Hero radar={radar} />
      <Historia radar={radar} />
      <ComoFunciona />
      <IaConIntencion />
      <Sensor />
      <Impacto radar={radar} />
      <Cierre />
    </main>
  );
}
