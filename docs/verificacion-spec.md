# Verificación contra la spec

Revisión punto por punto de [spec-radar-contenido.md](../spec-radar-contenido.md) contra el producto
publicado en https://radar-contenido-kappa.vercel.app, con la corrida del 17 de octubre de 2026 a las
7:51 p. m. El radar se actualiza cada día, así que las cifras de la página cambian con cada corrida.

Leyenda: **Cumple**, **Parcial** (funciona con una limitación conocida).

## Alcance v1

| Punto | Estado | Evidencia |
|---|---|---|
| Fuentes públicas en tres capas | Cumple | La página muestra cada fuente con su estado. La corrida leyó 954 piezas: 435 de Hacker News, 80 de arXiv, 68 de newsletters de expertos, 249 de YouTube, 119 de prensa de negocios y 3 aportes del equipo. Si una fuente falla o agota su cupo, se usa su último resultado guardado y la página lo indica. |
| Sensor humano | Cumple | Formulario publicado y hoja de respuestas leída como CSV desde un secreto. Los aportes aparecen como "aportes del equipo", sin enlaces ni nombres. |
| Agrupación por tema y top | Cumple | Temas dentro de los 8 pilares de la Inmersión 30X, con máximo dos por pilar. La corrida dejó 9 temas en 6 pilares: un candidato sin evidencia suficiente se descarta antes que mostrarlo. |
| Etapa por capas y velocidad | Cumple | La corrida tiene temas creciendo y en pico. "Pico" exige al menos 3 menciones en la prensa de negocios. |
| Curva de 30 días | Cumple | Mini gráfico en cada fila y gráfico completo en el detalle. |
| Canales y medios que hablan del tema | Cumple | Sección "Quiénes hablan de él" en el detalle. |
| Gancho y formato de las piezas principales | Cumple | Sección "Cómo lo cuentan" con gancho, formato y análisis. |
| Porqué con evidencia enlazada | Cumple | Sección "Por qué está creciendo" con enlaces a las piezas que la respaldan. |
| Perfiles de 30X y Andrés Bilbao | Cumple | `pipeline/config/perfiles/` con quién es, audiencia, voz, formatos, productos y fuentes. |
| Brief por tema y perfil | Cumple | Ángulo, formato, gancho y oportunidad ligada a un producto real de la marca; se valida que producto y formato existan en el perfil. |
| Página pública interactiva | Cumple | Landing, radar con filtro por pilar, detalle por tema, brief completo, bienvenida en 3 pasos y versión para celular. |
| Actualización automática diaria | Cumple | Flujo de GitHub Actions a las 5:00 a. m. hora Colombia, con caché de fuentes. |
| Fecha y costo visibles | Cumple | "Actualizado el 17 de octubre a las 7:51 p. m." y el costo de la corrida (USD 0,66). |
| URL desplegada | Cumple | https://radar-contenido-kappa.vercel.app |
| Repositorio público con documentación | Cumple | https://github.com/CristianCeron/radar-contenido con README, spec y guías. |
| Video pitch de hasta 3 minutos | Cumple | https://youtu.be/zv9kBdsJgSs (2:45). |

## No incluye (decisión permanente)

| Punto | Estado | Evidencia |
|---|---|---|
| Sin scraping de LinkedIn, Instagram o TikTok | Cumple | Solo APIs oficiales y RSS. El sensor humano usa lo que escribe la persona, palabras del enlace y oEmbed oficial. |
| Sin datos personales | Cumple | No se guarda el usuario de Hacker News ni el autor de las notas. Los enlaces del sensor nunca llegan al radar publicado (prueba dedicada y barrera final en el orquestador). Se muestran nombres de canales y medios públicos. |

## Comportamiento

| Punto | Estado | Evidencia |
|---|---|---|
| 1. Recolección diaria con fecha | Cumple | Flujo diario y `generatedAt` en el radar. |
| 2. Agrupa, calcula velocidad y etapa | Cumple | Velocidad suavizada (última semana contra la anterior) y regla de etapa con umbrales por capa. |
| 3. Top por velocidad y relevancia | Cumple | Puntaje = velocidad × relevancia, con mínimo de 8 menciones recientes y sin temas genéricos. |
| 4. Porqué con evidencia y análisis de gancho | Cumple | Explicación restringida a la evidencia recolectada; sin evidencia válida, el tema se descarta. |
| 5. Top y detalle con quiénes, cómo y por qué | Cumple | Revisado en la página publicada. |
| 6. Brief en vivo al cambiar de perfil en pocos segundos | Parcial | Funciona en la URL pública; tarda entre 10 y 15 segundos con Gemini 2.5 Flash. Si pasa de 15 segundos responde con el brief de la mañana y lo indica. |
| 7. Fecha y costo visibles | Cumple | Ver arriba. |

## Errores y seguridad

| Punto | Estado | Evidencia |
|---|---|---|
| Fuente caída o sin cupo: usa lo último guardado y lo indica | Cumple | Caché por fuente; la página muestra "último guardado del ..." cuando aplica. Probado con fixtures. |
| Brief que no se puede generar: mensaje claro y se conserva el anterior | Cumple | `/api/brief` responde con el brief del día o con un mensaje claro; la interfaz conserva el último brief. |
| Explicación sin evidencia no se muestra | Cumple | Prueba dedicada; además el orquestador nunca publica un radar sin temas. |
| Límite de costo por corrida | Cumple | Tope de USD 1,50; si se supera, no se escribe nada y queda el radar anterior. |
| Solo contenido público con APIs oficiales | Cumple | Ver "No incluye". |
| Sin login | Cumple | La página es pública. |
| Claves fuera del repositorio | Cumple | `.env` ignorado, secretos en GitHub y Vercel, y una prueba que revisa que ningún archivo versionado tenga claves. |

## Límite conocido

Las pruebas confirman que el radar funciona como está diseñado, no que el top sea "el correcto" para
la audiencia de 30X. Medirlo contra el desempeño real de lo que se publica es el siguiente paso (ver
"Siguientes pasos" en el README).
