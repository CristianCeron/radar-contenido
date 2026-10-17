import type { Radar } from "pipeline/schema";
import { SourceChips } from "./badges";
import { BrandPicker } from "./BrandPicker";
import { RadarList } from "./RadarList";
import { StaleWarning } from "./notices";
import { formatDay, formatUsd, isStale } from "../lib/format";

interface RadarMarketProps {
  radar: Radar;
  now: Date;
  initialPilar?: string;
}

// Página del radar: los temas de la semana con su etapa, variación y evidencia de crecimiento.
export function RadarMarket({ radar, now, initialPilar }: RadarMarketProps) {
  const stale = isStale(radar.generatedAt, now);

  return (
    <main>
      <section className="bg-ink text-white">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-7 px-4 pt-5 pb-7 sm:px-8 sm:pt-12 sm:pb-10">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="flex flex-col gap-4">
              <span className="self-start rounded-full border border-accent/35 bg-accent/12 px-3 py-1.5 text-[13px] font-medium text-accent">
                Datos del {formatDay(radar.generatedAt)} · Costo de la corrida: {formatUsd(radar.cost.totalUsd)}
              </span>
              <h1 className="text-[40px] leading-none font-semibold tracking-[-0.035em] sm:text-[56px]">
                Los {radar.topics.length} temas <span className="serif text-accent">de la semana</span>
              </h1>
            </div>
            <BrandPicker profiles={radar.profiles} />
          </div>
          <SourceChips sources={radar.sources} />
        </div>
      </section>

      <section>
        <div className="mx-auto flex max-w-[1280px] flex-col gap-5 px-4 pt-8 pb-20 sm:px-8">
          {stale && <StaleWarning generatedAt={radar.generatedAt} />}
          <RadarList topics={radar.topics} initialPilar={initialPilar} />
          <p className="text-[13px] text-muted-2">
            Variación semanal suavizada: compara los últimos 7 días con los 7 anteriores. Relevancia: qué tanto le sirve el tema a
            founders y ejecutivos, de 0 a 100. Toca un tema para ver su detalle.
          </p>
        </div>
      </section>
    </main>
  );
}
