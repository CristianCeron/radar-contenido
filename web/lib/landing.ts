import type { Stage, Topic } from "pipeline/schema";

// Contorno simplificado de Latinoamérica (longitud, latitud). Solo sirve para el mapa de puntos
// decorativo del hero.
const LATAM: [number, number][] = [
  [-117, 32.5], [-108, 31.5], [-106, 31.8], [-97, 26], [-97.5, 22], [-95, 18.5], [-91, 19], [-87, 21.5],
  [-88, 16], [-83, 15], [-83.5, 10.5], [-77.5, 8.5], [-75.5, 10.8], [-72, 12], [-68, 10.5], [-62, 10.7],
  [-60, 8.5], [-57, 6], [-52, 5], [-50, 1], [-44, -2.5], [-35, -5.5], [-35, -9], [-39, -14], [-40, -20],
  [-44, -23], [-48.5, -26], [-53, -33.5], [-58, -34.5], [-57, -38], [-62, -39], [-65, -42], [-66, -47],
  [-69, -51], [-68.5, -54.5], [-72, -53.5], [-75, -48], [-73.5, -42], [-73.5, -37], [-71.5, -30],
  [-70.3, -18], [-76, -14], [-80.5, -6], [-81, -4], [-80, -1], [-78.5, 1.5], [-77.5, 7.5], [-80, 8.5],
  [-83, 8], [-86, 11], [-88, 13.2], [-92, 14.5], [-94.5, 16], [-97, 15.8], [-101, 17.5], [-105.5, 20.5],
  [-105.5, 23], [-109.5, 26], [-112.5, 29], [-114.5, 30.5],
];

function inside(lon: number, lat: number): boolean {
  let c = false;
  for (let i = 0, j = LATAM.length - 1; i < LATAM.length; j = i++) {
    const [xi, yi] = LATAM[i];
    const [xj, yj] = LATAM[j];
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

export interface Point {
  x: number;
  y: number;
}

// Puntos del mapa en porcentaje del cuadro (0 a 100), para que el mismo dibujo escale del celular
// al escritorio. El cuadro cubre 90 grados en cada eje.
export function latamDots(step: number): Point[] {
  const dots: Point[] = [];
  for (let lon = -117; lon <= -34; lon += step) {
    for (let lat = 33; lat >= -56; lat -= step) {
      if (inside(lon, lat)) dots.push({ x: ((lon + 121) / 90) * 100, y: ((33 - lat) / 90) * 100 });
    }
  }
  return dots;
}

// Radio de cada anillo en porcentaje del cuadro: las etapas tempranas quedan afuera, donde el radar
// las detecta primero.
const RING: Record<Stage, number> = { emergente: 44.6, creciendo: 33.9, pico: 23.2, saturado: 12.5 };

export interface Blip extends Point {
  stage: Stage;
  hot: boolean;
}

// Un punto por tema del radar, repartidos alrededor del centro. Late si el tema todavía es temprano
// y viene subiendo: son los que vale la pena publicar ya.
export function radarBlips(topics: Topic[]): Blip[] {
  return topics.map((t, i) => {
    const a = ((-62 + i * 37) * Math.PI) / 180;
    const r = RING[t.stage];
    const early = t.stage === "emergente" || t.stage === "creciendo";
    return {
      x: 50 + r * Math.cos(a),
      y: 50 + r * Math.sin(a),
      stage: t.stage,
      hot: early && (t.velocity ?? 0) > 0,
    };
  });
}

// Los dos temas que más suben y el que más cae, para mostrar que el radar ordena en ambos sentidos.
export function highlightTopics(topics: Topic[]): Topic[] {
  const sorted = [...topics].sort((a, b) => (b.velocity ?? 0) - (a.velocity ?? 0));
  if (sorted.length <= 3) return sorted;
  return [sorted[0], sorted[1], sorted[sorted.length - 1]];
}

// Barras sueltas y torcidas que representan publicaciones sin orden. Semilla fija para que el
// servidor y el navegador dibujen lo mismo.
export function noiseBars(count: number, seed: number): { left: number; top: number; width: number; rotate: number; opacity: number }[] {
  let s = seed;
  const rnd = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  return Array.from({ length: count }, () => ({
    left: rnd() * 82,
    top: rnd() * 94,
    width: 40 + rnd() * 110,
    rotate: rnd() * 40 - 20,
    opacity: 0.5 + rnd() * 0.5,
  }));
}
