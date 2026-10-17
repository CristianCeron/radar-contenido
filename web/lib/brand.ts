"use client";

import { useEffect, useState } from "react";

const KEY = "radar30x.marca";

// Avisa a los selectores que ya están en pantalla cuando la marca cambia en otro lado (por ejemplo,
// en la bienvenida), para que no queden mostrando la anterior.
export const BRAND_EVENT = "radar:marca";

// La marca elegida se recuerda en el navegador para que el radar, el detalle y el brief usen la
// misma. Si el almacenamiento falla (modo privado, bloqueado), se queda con la marca por defecto.
export function readBrand(): string | null {
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function saveBrand(id: string): void {
  try {
    window.localStorage.setItem(KEY, id);
  } catch {
    // sin almacenamiento la página sigue funcionando
  }
  window.dispatchEvent(new CustomEvent(BRAND_EVENT, { detail: id }));
}

export function useBrand(validIds: string[], initial?: string): [string, (id: string) => void] {
  const fallback = initial && validIds.includes(initial) ? initial : validIds[0] ?? "";
  const [brand, setBrand] = useState(fallback);

  useEffect(() => {
    if (initial && validIds.includes(initial)) return;
    const saved = readBrand();
    if (saved && validIds.includes(saved)) setBrand(saved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onChange = (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      if (validIds.includes(id)) setBrand(id);
    };
    window.addEventListener(BRAND_EVENT, onChange);
    return () => window.removeEventListener(BRAND_EVENT, onChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function change(id: string) {
    setBrand(id);
    saveBrand(id);
  }

  return [brand, change];
}
