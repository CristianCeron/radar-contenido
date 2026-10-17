# Radar de contenido

Detecta qué temas de crecimiento de empresas están despegando, organizados por los pilares de la
Inmersión 30X (liderazgo, growth, equipos, ventas, marketing, expansión, fundraising e IA aplicada),
explica por qué con evidencia enlazada y los convierte en
briefs de contenido para una marca concreta. Prototipo para el reto "Radar de contenido" del
Hackathon 30X, con dos perfiles: 30X y Andrés Bilbao.

**Demo:** https://radar-contenido-kappa.vercel.app

Hoy los equipos de media pagan servicios de scraping que traen datos pero no explican por qué algo
funcionó ni si encaja con su audiencia. El radar usa solo fuentes oficiales y públicas, muestra la
evidencia de cada afirmación y entrega un brief listo para producir.

## Qué hace

- **Recolecta** cada madrugada lo publicado en los últimos 30 días en fuentes oficiales, ordenadas
  en tres capas: origen (Hacker News, newsletters de expertos en growth, ventas y liderazgo, y un
  arXiv reducido a IA y economía), difusión (YouTube) y audiencia ejecutiva (prensa de negocios,
  medios de startups de Latinoamérica y consultoras por RSS). Se suma un **sensor humano**: el
  equipo pega enlaces de LinkedIn, Instagram o TikTok en un formulario.
- **Agrupa** las piezas en temas dentro de cada pilar de la Inmersión, mide la velocidad (última
  semana contra la anterior) y asigna la etapa según las capas a las que ya llegó: emergente,
  creciendo, pico o saturado.
- **Selecciona** el top 10 por velocidad y relevancia para founders y ejecutivos de Latinoamérica,
  con máximo dos temas por pilar para que la IA, de la que todos hablan, no se coma el ranking.
- **Explica** por qué crece cada tema, solo con la evidencia recolectada. Una explicación sin
  evidencia enlazada no se muestra.
- **Genera briefs** por marca (ángulo, formato, gancho y oportunidad ligada a un producto) y uno
  nuevo en vivo cuando se cambia de perfil en la página.
- Muestra en la página la **fecha de los datos y el costo** de la última corrida.

## Decisiones de producto

- **Actualización diaria y brief en vivo.** El análisis pesado corre una vez al día (unos 15
  minutos, menos de USD 1). La página solo lee el resultado, así que carga al instante. Lo único que
  se calcula al momento es el brief al cambiar de marca, con respaldo al brief del día si el modelo
  no responde a tiempo.
- **Solo fuentes oficiales.** Nada de scraping de LinkedIn, Instagram o TikTok. Esas redes entran
  por el sensor humano, y el radar nunca publica sus enlaces porque suelen llevar el nombre de una
  persona.
- **Evidencia antes que opinión.** Cada explicación cita piezas reales. Los briefs tienen prohibido
  inventar cifras.
- **Sin costo para el equipo.** Redacción con Gemini por Agent Platform, pagado con créditos de
  Google Cloud. Claude queda listo como modo de mayor calidad cambiando una variable.

## Arquitectura

```
pipeline/   Recolecta, clasifica, agrupa, rankea, explica y escribe web/public/data/radar.json
  src/sources/   Adaptadores: Hacker News, arXiv, YouTube, RSS y sensor humano
  src/classify/  JEV (Eden AI) con respaldo en el modelo rápido
  src/llm/       Gemini (AI Studio o Agent Platform) y Claude, elegidos por variable de entorno
  config/        Feeds RSS y perfiles de marca
web/        Next.js: lista tipo mercado, detalle de tema y /api/brief para el brief en vivo
.github/    Flujo diario que corre el pipeline y guarda el nuevo radar.json
```

Todas las llamadas externas pasan por un adaptador propio y se prueban con respuestas grabadas.

## Cómo correrlo

Requisitos: Node 22 o superior.

```bash
npm install
cp .env.example .env
```

Llena el `.env` siguiendo [docs/claves.md](docs/claves.md). Solo YouTube y Gemini son
obligatorias; Hacker News, arXiv y RSS no piden clave.

```bash
npm run pipeline   # corre el radar y escribe web/public/data/radar.json
npm run dev        # abre la página en http://localhost:3000
```

## Cambiar de tema

El tema no está en el código. Las búsquedas por fuente, los feeds, el filtro de prensa, la
audiencia y los pilares viven en [pipeline/config/tema.json](pipeline/config/tema.json), que hoy es
"crecimiento de empresas". Para rastrear otro tema se crea un archivo en `pipeline/config/temas/` y
se corre con `RADAR_TEMA`. Hay dos de ejemplo: solo IA y emprendimiento.

```bash
RADAR_TEMA=ia npm run pipeline
```

Ese radar se escribe en `web/public/data/radar-ia.json` y usa su propia caché, así que no pisa el
radar publicado.

## Pruebas

```bash
npm test
```

Corre las pruebas del pipeline y de la web con vitest. No llaman a ningún servicio real: usan
respuestas grabadas en `pipeline/test/fixtures`.

## Documentos

- [Spec](spec-radar-contenido.md)
- [Cómo obtener las claves](docs/claves.md)
- [Sensor humano](docs/sensor-humano.md)
