# Radar de contenido

Detecta qué temas de crecimiento de empresas están despegando, organizados por los pilares de la
Inmersión 30X (liderazgo, growth, equipos, ventas, marketing, expansión, fundraising e IA aplicada),
explica por qué con evidencia enlazada y los convierte en
briefs de contenido para una marca concreta. Prototipo para el reto "Radar de contenido" del
Hackathon 30X, con dos perfiles: 30X y Andrés Bilbao.

- **Demo:** https://radar-contenido-kappa.vercel.app
- **Video del pitch (2:45):** https://youtu.be/zv9kBdsJgSs

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
- Muestra en la página el **día y la hora de la última actualización** y el costo de esa corrida.

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

## Costos y operación

| Concepto | Valor |
|---|---|
| Costo por corrida | Entre USD 0,67 y 0,84 (70 a 120 llamadas a Gemini, 9 a 18 minutos) |
| Costo mensual con una corrida diaria | Unos USD 20 a 25, más centavos por los briefs en vivo |
| Costo mensual con una corrida semanal | Unos USD 3 a 4 (se cambia el horario en `.github/workflows/radar-diario.yml`) |
| Tope de costo por corrida | USD 1,50 (`RUN_COST_LIMIT_USD`); si se supera, no se publica nada y queda el radar anterior |
| Fuentes sin costo | Hacker News, arXiv, RSS y YouTube (cupo gratis de 10.000 unidades al día; una corrida usa unas 800) |
| Infraestructura | GitHub Actions (corrida diaria) y Vercel Hobby (página); ambos gratis |

- **Quién paga hoy:** los modelos se pagan con los créditos de la prueba gratuita de Google Cloud
  (Gemini por Agent Platform). Cuando venzan, hay que activar la facturación en Google Cloud (unos USD
  20 a 25 al mes) o pasar a Claude con `LLM_PROVIDER=anthropic`.
- **Si una fuente falla o agota su cupo**, el radar usa su último resultado guardado y la página lo
  indica con su fecha.
- **Mantenimiento:** los feeds RSS pueden cambiar de dirección; están en el archivo de tema y se
  reemplazan sin tocar código. Los perfiles de marca tienen una lista `porValidar` para que el
  equipo de 30X confirme datos.
- **Límites conocidos:** el ranking mide crecimiento en las fuentes que lee, no el desempeño real de
  las publicaciones; LinkedIn, Instagram y TikTok solo entran por el sensor humano; el brief en vivo
  tarda entre 10 y 15 segundos, y si pasa de 15 la página muestra el brief de la mañana y lo indica.

## Pruebas

```bash
npm test
```

Corre las pruebas del pipeline y de la web con vitest (246 en total). No llaman a ningún servicio
real: usan respuestas grabadas en `pipeline/test/fixtures`.

## Siguientes pasos

- **Aprender de lo que funciona:** conectar el radar con las métricas de las cuentas propias de 30X
  (APIs oficiales) para medir cómo rinden los temas publicados y ajustar el ranking con esos datos.
- **Histórico en la página:** cada corrida ya queda guardada en el repositorio; mostrar día por día
  cómo se mueve cada tema.
- **Alertas** cuando un tema pasa de emergente a creciendo, que es el mejor momento para publicar.
- **Más fuentes oficiales:** Reddit (API oficial) y podcasts por RSS.
- **Activar JEV** (Eden AI) como clasificador principal y bajar la latencia del brief en vivo.

## Documentos

- [Spec](spec-radar-contenido.md)
- [Verificación contra la spec](docs/verificacion-spec.md)
- [Cómo obtener las claves](docs/claves.md)
- [Sensor humano](docs/sensor-humano.md)

## Autor y contacto

Construido por **Cristian Cerón**, product manager y product builder, para el Hackathon 30X.

- LinkedIn: https://www.linkedin.com/in/cristianceronb/
- Correo: [cristian.ceronb@gmail.com](mailto:cristian.ceronb@gmail.com)

## Licencia

[MIT](LICENSE): cualquiera puede usar, copiar y modificar el código, citando al autor.

## Agradecimientos

Al equipo de 30X por plantear el reto "Radar de contenido" y por la charla de pitch del hackathon.
