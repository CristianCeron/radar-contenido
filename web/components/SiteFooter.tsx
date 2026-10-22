const LINKEDIN = "https://www.linkedin.com/in/cristianceronb/";

const external = { target: "_blank", rel: "noopener noreferrer" } as const;

// Pie común: quién construyó el radar, cómo contactarlo y un aviso sobre el brief en vivo, que
// depende de créditos de prueba.
export function SiteFooter() {
  return (
    <footer className="border-t border-[#1f1f1d] bg-ink text-soft">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-8 px-5 py-10 sm:px-8 sm:py-12">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between md:gap-10">
          <div className="flex max-w-[560px] flex-col gap-3">
            <span className="text-[17px] font-semibold text-white">
              Construido por Cristian Cerón
            </span>
            <p className="m-0 text-[15px] leading-[1.5]">
              Los grandes resultados no se construyen solo con metodología, sino con visión, empatía y propósito. Este proyecto es esa idea
              aplicada: evidencia antes de opinar sobre lo que está moviendo a las empresas de Latinoamérica.
            </p>
          </div>
          <a
            href={LINKEDIN}
            {...external}
            className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2.5 self-stretch rounded-full bg-accent px-6 py-3.5 text-[15px] font-semibold text-ink transition-colors hover:bg-accent-hover md:self-center"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9.75h4v11H3zM9.5 9.75h3.8v1.5h.06c.53-1 1.83-2.05 3.77-2.05 4.03 0 4.77 2.65 4.77 6.1v5.45h-4v-4.83c0-1.15-.02-2.63-1.6-2.63-1.6 0-1.85 1.25-1.85 2.55v4.91h-4z" />
            </svg>
            Conectemos en LinkedIn
          </a>
        </div>

        <div className="border-t border-ink-line-2 pt-6">
          <span className="text-sm">
            <span className="font-semibold text-white">
              Radar <span className="text-accent">30X</span>
            </span>{" "}
            · Hackathon 30X
          </span>
        </div>

        <p className="m-0 text-center text-[13px] leading-[1.5] text-muted">
          El brief en vivo usa Gemini con créditos de prueba de Google Cloud. Si tarda más de 15 segundos o falla, ves el brief de la mañana:
          es un límite del demo, no un error del producto.
        </p>
      </div>
    </footer>
  );
}
