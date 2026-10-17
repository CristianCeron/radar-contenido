"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { openWelcome } from "../lib/welcome";

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight text-white sm:gap-2.5 sm:text-xl">
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border-[1.5px] border-accent sm:h-[22px] sm:w-[22px]">
        <span className="h-1.5 w-1.5 rounded-full bg-accent" />
      </span>
      <span>
        Radar <span className="text-accent">30X</span>
      </span>
    </Link>
  );
}

interface NavItem {
  href: string;
  label: string;
  current?: boolean;
}

// En la landing el menú sigue la historia de la página. En el resto, primero cómo funciona y
// después el radar.
export function navFor(path: string): NavItem[] {
  if (path === "/") {
    return [
      { href: "#historia", label: "El problema" },
      { href: "#como-funciona", label: "Cómo funciona" },
      { href: "#impacto", label: "Impacto" },
    ];
  }
  return [
    { href: "/#como-funciona", label: "Cómo funciona" },
    { href: "/radar", label: "El radar", current: path === "/radar" || path.startsWith("/tema") },
  ];
}

const circle =
  "inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full border border-[#3a3934] bg-transparent text-white transition-colors hover:border-accent";

interface HeaderViewProps {
  path: string;
  menuOpen: boolean;
  onToggleMenu: () => void;
  onHelp: () => void;
  onNavigate: () => void;
}

// Lo que se ve del encabezado. Va separado del estado para poder probarlo sin navegador.
export function HeaderView({ path, menuOpen, onToggleMenu, onHelp, onNavigate }: HeaderViewProps) {
  const nav = navFor(path);
  const landing = path === "/";
  return (
    <header className="relative z-40 border-b border-[#1f1f1d] bg-ink">
      <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-6 px-5 py-3.5 sm:px-8 sm:py-[18px]">
        <Logo />
        <nav aria-label="Principal" className="hidden gap-7 text-[15px] md:flex">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              aria-current={n.current ? "page" : undefined}
              className={n.current ? "text-white" : "text-soft transition-colors hover:text-white"}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2 md:gap-3">
          <button type="button" onClick={onHelp} aria-label="Abrir la bienvenida" className={circle}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <circle cx="12" cy="12" r="9.5" />
              <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6" />
              <circle cx="12" cy="17" r=".6" fill="currentColor" />
            </svg>
          </button>
          {landing && (
            <Link
              href="/radar"
              className="hidden rounded-full bg-accent px-[22px] py-3 text-[15px] font-semibold text-ink transition-colors hover:bg-accent-hover md:inline-flex"
            >
              Ver el radar
            </Link>
          )}
          <button
            type="button"
            onClick={onToggleMenu}
            aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={menuOpen}
            aria-controls="menu-celular"
            className={`${circle} md:hidden`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <path d={menuOpen ? "M6 6l12 12M18 6L6 18" : "M4 8h16M4 16h16"} />
            </svg>
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav
          id="menu-celular"
          aria-label="Menú"
          className="menu-in absolute inset-x-0 top-full flex flex-col gap-1 border-b border-[#1f1f1d] bg-ink px-5 pt-2 pb-6 md:hidden"
        >
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              onClick={onNavigate}
              aria-current={n.current ? "page" : undefined}
              className={`flex min-h-12 items-center border-b border-ink-line-2 text-xl font-semibold tracking-[-0.02em] ${
                n.current ? "text-accent" : "text-white"
              }`}
            >
              {n.label}
            </Link>
          ))}
          {landing && (
            <Link
              href="/radar"
              onClick={onNavigate}
              className="mt-4 rounded-full bg-accent p-4 text-center text-[17px] font-semibold text-ink"
            >
              Ver el radar
            </Link>
          )}
        </nav>
      )}
    </header>
  );
}

// Encabezado común: logo, navegación, ayuda y, en celular, el menú.
export function SiteHeader() {
  const path = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => setMenuOpen(false), [path]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  return (
    <HeaderView
      path={path}
      menuOpen={menuOpen}
      onToggleMenu={() => setMenuOpen((o) => !o)}
      onHelp={() => {
        setMenuOpen(false);
        openWelcome();
      }}
      onNavigate={() => setMenuOpen(false)}
    />
  );
}
