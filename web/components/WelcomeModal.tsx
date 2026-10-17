"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { Stage } from "pipeline/schema";
import { PILARES } from "../lib/pilares";
import { STAGE_LABEL } from "../lib/format";
import { readBrand, saveBrand } from "../lib/brand";
import { WELCOME_EVENT, markWelcomeSeen, shouldShowWelcome } from "../lib/welcome";

const STEPS = 3;

// Descripción corta de cada marca. Si llega un perfil nuevo sin descripción, se muestra solo el nombre.
const BLURB: Record<string, [string, string]> = {
  "30x": ["Escuela de negocios de Latinoamérica.", " Por founders, para founders."],
  "andres-bilbao": ["Cofundador de Rappi y CEO de 30X.", " Voz de mentor directo."],
};

// Cada etapa con las capas a las que llegó (origen, difusión, audiencia ejecutiva) y qué hacer.
const ETAPAS: { stage: Stage; badge: string; layers: number; text: [string, string] }[] = [
  { stage: "emergente", badge: "bg-accent text-ink", layers: 1, text: ["Solo en foros y expertos.", " Llegas primero."] },
  { stage: "creciendo", badge: "bg-stage-creciendo text-ink", layers: 2, text: ["Ya está en YouTube.", " Buen momento."] },
  { stage: "pico", badge: "bg-ink text-white", layers: 3, text: ["Llegó a la prensa.", " Necesitas un ángulo propio."] },
  { stage: "saturado", badge: "bg-stage-saturado text-stage-saturado-text", layers: 3, text: ["Todos hablan de él y va cayendo.", ""] },
];

interface WelcomeStepsProps {
  step: number;
  brand: string;
  profiles: { id: string; nombre: string }[];
  topicCount: number;
  onBrand: (id: string) => void;
  onNext: () => void;
  onBack: () => void;
  onClose: () => void;
  onStart: () => void;
}

const title = "m-0 text-[34px] leading-[1.02] font-semibold tracking-[-0.03em] sm:text-[44px]";
const kicker = "text-[13px] font-semibold text-muted sm:text-sm";
const primary =
  "cursor-pointer rounded-full border-0 bg-accent px-7 py-4 text-[17px] font-semibold text-ink transition-colors hover:bg-accent-hover sm:py-3.5 sm:text-base";

function LayerDots({ n, saturado }: { n: number; saturado: boolean }) {
  return (
    <span className="hidden gap-1 sm:flex" aria-hidden="true">
      {[1, 2, 3].map((i) => (
        <span
          key={i}
          className={`h-2.5 w-2.5 rounded-full ${i <= n ? (saturado ? "bg-fail" : "bg-ink") : "border border-soft"}`}
        />
      ))}
    </span>
  );
}

// Lo que se ve en cada paso. Va separado del estado para poder probarlo sin navegador.
export function WelcomeSteps(p: WelcomeStepsProps) {
  const last = p.step === STEPS;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="bienvenida-titulo"
      tabIndex={-1}
      className="welcome-pop flex max-h-[100dvh] w-full flex-col gap-[22px] overflow-y-auto rounded-t-[28px] bg-white px-5 pt-3.5 pb-8 text-ink shadow-[0_40px_120px_rgba(0,0,0,.5)] outline-none sm:w-[640px] sm:max-w-[calc(100vw-32px)] sm:gap-7 sm:rounded-[28px] sm:p-10"
    >
      <span className="h-1 w-10 self-center rounded-full bg-line-2 sm:hidden" aria-hidden="true" />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 sm:gap-2" role="img" aria-label={`Paso ${p.step} de ${STEPS}`}>
          {Array.from({ length: STEPS }, (_, i) => i + 1).map((n) => (
            <span
              key={n}
              className={`inline-block h-2 rounded-full transition-[width] duration-250 ${n === p.step ? "w-6 sm:w-7" : "w-2"} ${
                n <= p.step ? "bg-ink" : "bg-line-2"
              }`}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={p.onClose}
          aria-label="Cerrar"
          className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-line bg-white transition-colors hover:border-ink"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0a0a0a" strokeWidth="1.75" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>

      {p.step === 1 && (
        <div className="flex flex-1 flex-col gap-3.5 sm:gap-[18px]">
          <span className={kicker}>Bienvenido a Radar 30X</span>
          <h2 id="bienvenida-titulo" className={title}>
            Qué publicar esta semana, <span className="serif">y por qué</span>
          </h2>
          <p className="m-0 text-base leading-normal text-[#5c574d] sm:text-lg">
            Cada madrugada el radar lee fuentes oficiales, detecta los {p.topicCount} temas de crecimiento de empresas que más despegan
            y te los entrega con su evidencia y un brief listo para producir.
          </p>
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            <span className="rounded-full bg-accent px-3 py-1.5 text-xs font-semibold sm:text-[13px]">{p.topicCount} temas</span>
            <span className="rounded-full bg-paper px-3 py-1.5 text-xs font-medium sm:text-[13px]">
              {PILARES.length} pilares de la Inmersión
            </span>
            <span className="rounded-full bg-paper px-3 py-1.5 text-xs font-medium sm:text-[13px]">Sin scraping</span>
          </div>
        </div>
      )}

      {p.step === 2 && (
        <div className="flex flex-1 flex-col gap-3.5 sm:gap-[18px]">
          <span className={kicker}>Cómo leerlo</span>
          <h2 id="bienvenida-titulo" className={title}>
            Cada tema va en <span className="serif">una etapa</span>
          </h2>
          <ul className="m-0 grid list-none grid-cols-2 gap-2 p-0 sm:grid-cols-4 sm:gap-2.5">
            {ETAPAS.map((e) => (
              <li key={e.stage} className="flex flex-col gap-2 rounded-2xl bg-paper p-3.5 sm:gap-2.5 sm:rounded-[18px] sm:p-4">
                <LayerDots n={e.layers} saturado={e.stage === "saturado"} />
                <span className={`self-start rounded-full px-2.5 py-1 text-xs font-semibold ${e.badge}`}>{STAGE_LABEL[e.stage]}</span>
                <span className="text-[13px] leading-[1.35] text-[#5c574d]">
                  {e.text[0]}
                  <span className="hidden sm:inline">{e.text[1]}</span>
                </span>
              </li>
            ))}
          </ul>
          <span className="hidden text-[13px] text-muted-2 sm:block">Los puntos son las capas: origen, difusión y audiencia ejecutiva.</span>
        </div>
      )}

      {p.step === 3 && (
        <div className="flex flex-1 flex-col gap-3.5 sm:gap-[18px]">
          <span className={kicker}>Elige tu marca</span>
          <h2 id="bienvenida-titulo" className={title}>
            ¿Para quién <span className="serif">produces</span> hoy?
          </h2>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3">
            {p.profiles.map((b) => {
              const on = b.id === p.brand;
              const blurb = BLURB[b.id];
              return (
                <button
                  key={b.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => p.onBrand(b.id)}
                  className={`flex cursor-pointer flex-col gap-1.5 rounded-[18px] border-[1.5px] p-[18px] text-left transition-colors sm:min-h-[150px] sm:gap-2.5 sm:rounded-[20px] sm:p-[22px] ${
                    on ? "border-ink bg-ink text-white" : "border-line bg-white text-ink hover:border-ink"
                  }`}
                >
                  <span className="text-[19px] font-semibold sm:text-[22px]">{b.nombre}</span>
                  {blurb && (
                    <span className="text-[13px] leading-[1.4] opacity-75 sm:text-sm">
                      {blurb[0]}
                      <span className="hidden sm:inline">{blurb[1]}</span>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <span className="hidden text-[13px] text-muted-2 sm:block">
            Puedes cambiarla luego desde el radar. La elección personaliza los briefs.
          </span>
        </div>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <button
          type="button"
          onClick={p.onClose}
          className="cursor-pointer border-0 bg-transparent p-3 text-base font-medium text-[#5c574d] hover:text-ink sm:px-1"
        >
          Saltar
        </button>
        <div className="flex flex-col gap-2.5 sm:flex-row">
          {p.step > 1 && (
            <button
              type="button"
              onClick={p.onBack}
              className="hidden cursor-pointer rounded-full border border-line-2 bg-white px-6 py-3.5 text-base font-semibold text-ink hover:border-ink sm:block"
            >
              Atrás
            </button>
          )}
          {last ? (
            <button type="button" onClick={p.onStart} className={primary}>
              Empezar
            </button>
          ) : (
            <button type="button" onClick={p.onNext} className={primary}>
              Siguiente
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

// Bienvenida en 3 pasos. Se abre sola en la primera visita y cada vez que se toca el botón de ayuda
// del encabezado. Al empezar guarda la marca y lleva al radar.
export function WelcomeModal({ profiles, topicCount }: { profiles: { id: string; nombre: string }[]; topicCount: number }) {
  const ids = profiles.map((p) => p.id);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [brand, setBrand] = useState(ids[0] ?? "");
  const box = useRef<HTMLDivElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const router = useRouter();
  const path = usePathname();

  const show = useCallback(() => {
    const saved = readBrand();
    setBrand(saved && ids.includes(saved) ? saved : ids[0] ?? "");
    setStep(1);
    returnFocus.current = document.activeElement as HTMLElement | null;
    setOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const close = useCallback(() => {
    const s = storage();
    if (s) markWelcomeSeen(s);
    setOpen(false);
    returnFocus.current?.focus?.();
  }, []);

  useEffect(() => {
    const s = storage();
    if (s && shouldShowWelcome(s)) show();
    window.addEventListener(WELCOME_EVENT, show);
    return () => window.removeEventListener(WELCOME_EVENT, show);
  }, [show]);

  useEffect(() => {
    if (!open) return;
    const dialog = box.current?.querySelector<HTMLElement>('[role="dialog"]');
    dialog?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        return;
      }
      if (e.key !== "Tab" || !dialog) return;
      const items = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null);
      if (items.length === 0) return;
      const first = items[0];
      const lastItem = items[items.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
        e.preventDefault();
        lastItem.focus();
      } else if (!e.shiftKey && document.activeElement === lastItem) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, close]);

  if (!open) return null;

  function pick(id: string) {
    setBrand(id);
    saveBrand(id);
  }

  function start() {
    saveBrand(brand);
    close();
    if (path !== "/radar") router.push("/radar");
  }

  return (
    <div ref={box} className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-ink/60 backdrop-blur-[3px]" onClick={close} aria-hidden="true" />
      <div className="relative w-full sm:flex sm:w-auto sm:justify-center">
        <WelcomeSteps
          step={step}
          brand={brand}
          profiles={profiles}
          topicCount={topicCount}
          onBrand={pick}
          onNext={() => setStep((s) => Math.min(STEPS, s + 1))}
          onBack={() => setStep((s) => Math.max(1, s - 1))}
          onClose={close}
          onStart={start}
        />
      </div>
    </div>
  );
}
