import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "Radar de contenido",
  description: "Temas de crecimiento de empresas que despegan y qué contenido producir con ellos.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
