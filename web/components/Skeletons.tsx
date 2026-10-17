// Esqueletos de carga, con la misma forma de la página que viene.
export function RadarSkeleton() {
  return (
    <section aria-busy="true" aria-label="Cargando el radar" className="mx-auto max-w-[1280px] px-4 py-8 sm:px-8">
      <div className="flex flex-col gap-1 rounded-3xl bg-white p-6">
        <span className="pb-3 text-[13px] font-semibold tracking-[.08em] text-muted-2 uppercase">Cargando el radar</span>
        {[70, 58, 66, 50, 62].map((w) => (
          <div key={w} className="grid grid-cols-[40px_1fr_90px] items-center gap-4 border-t border-[#f1efea] py-3.5 lg:grid-cols-[40px_1fr_110px_90px_140px_80px]">
            <div className="sk-light h-3.5" />
            <div className="flex flex-col gap-2">
              <div className="sk-light h-4" style={{ width: `${w}%` }} />
              <div className="sk-light h-3" style={{ width: `${w / 2}%` }} />
            </div>
            <div className="sk-light h-[26px] rounded-full" />
            <div className="sk-light hidden h-5 lg:block" />
            <div className="sk-light hidden h-7 lg:block" />
            <div className="sk-light hidden h-3.5 lg:block" />
          </div>
        ))}
      </div>
    </section>
  );
}

export function BriefSkeleton() {
  return (
    <main aria-busy="true" aria-label="Cargando el brief" className="mx-auto flex max-w-[1280px] flex-col gap-7 px-4 pt-8 pb-24 sm:px-8 sm:pt-14">
      <div className="flex flex-col gap-3">
        <div className="sk-light h-3.5 w-60" />
        <div className="sk-light h-12 w-80 max-w-full" />
      </div>
      <div className="flex flex-col gap-[18px] rounded-[28px] bg-ink p-6 sm:p-10">
        <div className="sk h-11 w-56" />
        <div className="sk h-12 w-[86%]" />
        <div className="sk h-12 w-[60%]" />
        <div className="grid gap-4 md:grid-cols-3">
          <div className="sk h-24" />
          <div className="sk h-24" />
          <div className="sk h-24" />
        </div>
      </div>
    </main>
  );
}
