import "./globals.css";
import type { ReactNode } from "react";
import { Inter_Tight, Instrument_Serif } from "next/font/google";
import { SiteFooter } from "../components/SiteFooter";
import { SiteHeader } from "../components/SiteHeader";
import { WelcomeModal } from "../components/WelcomeModal";
import { loadRadar } from "../lib/radar";

const interTight = Inter_Tight({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-inter-tight" });
const instrumentSerif = Instrument_Serif({ subsets: ["latin"], weight: "400", style: "italic", variable: "--font-instrument-serif" });

export const metadata = {
  title: "Radar 30X",
  description: "Los temas de crecimiento de empresas que más despegan cada semana, con su evidencia y un brief listo para producir.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const radar = loadRadar();
  return (
    <html lang="es" className={`${interTight.variable} ${instrumentSerif.variable}`}>
      <body>
        <SiteHeader />
        {children}
        <SiteFooter />
        <WelcomeModal profiles={radar.profiles} topicCount={radar.topics.length} />
      </body>
    </html>
  );
}
