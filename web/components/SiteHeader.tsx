"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { openWelcome } from "../lib/welcome";

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5 text-xl font-semibold tracking-tight text-white">
      <span className="inline-flex h-[22px] w-[22px] items-center justify-center rounded-full border-[1.5px] border-accent">
        <span className="h-1.5 w-1.5 rounded-full bg-accent" />
      </span>
      <span>
        Radar <span className="text-accent">30X</span>
      </span>
    </Link>
  );
}

const NAV = [
  { href: "/radar", label: "El radar" },
  { href: "/#como-funciona", label: "Cómo funciona" },
];

// Encabezado común: logo, navegación y el botón que reabre la bienvenida.
export function SiteHeader() {
  const path = usePathname();
  return (
    <header className="bg-ink">
      <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-4 px-4 py-4 sm:px-8">
        <Logo />
        <nav aria-label="Principal" className="flex gap-5 text-[15px] sm:gap-7">
          {NAV.map((n) => {
            const active = n.href === "/radar" ? path === "/radar" || path.startsWith("/tema") : false;
            return (
              <Link
                key={n.href}
                href={n.href}
                aria-current={active ? "page" : undefined}
                className={active ? "text-white" : "text-soft transition-colors hover:text-white"}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>
        <button
          type="button"
          onClick={openWelcome}
          aria-label="Abrir la bienvenida"
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#3a3934] text-white transition-colors hover:border-accent"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <circle cx="12" cy="12" r="9.5" />
            <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6" />
            <circle cx="12" cy="17" r=".6" fill="currentColor" />
          </svg>
        </button>
      </div>
    </header>
  );
}
