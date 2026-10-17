import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex max-w-[1280px] flex-col items-start gap-5 px-4 py-20 sm:px-8">
      <h1 className="text-[40px] leading-none font-semibold tracking-[-0.035em] sm:text-[56px]">
        Este tema ya no está <span className="serif text-accent">en el radar</span>
      </h1>
      <p className="max-w-xl text-lg text-[#5c574d]">
        El radar se actualiza cada madrugada y los temas cambian. Revisa los de esta semana.
      </p>
      <Link
        href="/radar"
        className="inline-flex min-h-11 items-center rounded-full bg-accent px-6 py-3.5 font-semibold text-ink transition-colors hover:bg-accent-hover"
      >
        Ver el radar
      </Link>
    </main>
  );
}
