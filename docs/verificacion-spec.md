# Verificación contra la spec

Revisión punto por punto de [spec-radar-contenido.md](../spec-radar-contenido.md) contra el producto
publicado en https://radar-contenido-kappa.vercel.app, el 17 de octubre de 2026.

Leyenda: **Cumple**, **Parcial** (funciona con una limitación conocida), **Pendiente** (depende de
una acción fuera del código).

## Alcance v1

| Punto | Estado | Evidencia |
|---|---|---|
| Cuatro fuentes públicas en tres capas | Cumple | La portada muestra Hacker News, arXiv, YouTube y Prensa con su estado. La última corrida leyó 1.588, 300, 378 y 95 piezas. |
| Sensor humano | Parcial | Adaptador, pruebas y guía listos ([docs/sensor-humano.md](sensor-humano.md)). Falta crear el formulario y cargar `SENSOR_SHEET_CSV_URL`; sin eso la fuente no aparece y el radar corre igual. |
| Agrupación por tema y top 10 | Cumple | 40 temas agrupados con lista cerrada; la portada muestra 10 filas ordenadas por puntaje. |
| Etapa por capas y velocidad | Cumple | La corrida actual tiene temas en pico, creciendo y emergente. "Pico" exige al menos 3 notas de prensa. |
| Curva de 30 días | Cumple | Mini gráfico en cada fila y gráfico completo en el detalle. |
| Canales y medios que hablan del tema | Cumple | Sección "Quiénes hablan de él" en el detalle. |
| Gancho y formato de las piezas principales | Cumple | Sección "Cómo lo cuentan" con gancho, formato y análisis. |
| Porqué con evidencia enlazada | Cumple | Sección "Por qué está creciendo" con enlaces a las piezas; el detalle revisado tiene 12 enlaces externos. |
| Perfiles de 30X y Andrés Bilbao | Cumple | `pipeline/config/perfiles/` con quién es, audiencia, voz, formatos, productos y fuentes. Tienen una lista `porValidar` para revisión humana. |
| Brief por tema y perfil | Cumple | Ángulo, formato, gancho y oportunidad ligada a un producto real de la marca; se valida que producto y formato existan en el perfil. |
| Página pública interactiva | Cumple | Lista tipo mercado, detalle por tema y selector de perfil. El diseño visual final queda para después, por decisión del equipo. |
| Actualización automática diaria | Cumple | Flujo de GitHub Actions a las 5:00 a. m. hora Colombia, con caché de fuentes. Ver nota sobre la primera ejecución. |
| Fecha y costo visibles | Cumple | "Datos del 17 de octubre de 2026" y "Costo de la última corrida: USD 0,82". |
| URL desplegada | Cumple | https://radar-contenido-kappa.vercel.app |
| Repositorio público con documentación | Cumple | https://github.com/CristianCeron/radar-contenido con README, spec, plan y guías. |
| Video pitch de 3 minutos | Pendiente | Falta grabarlo. |

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
| 3. Top 10 por velocidad y relevancia | Cumple | Puntaje = velocidad × relevancia, con mínimo de 8 menciones recientes y sin temas genéricos. |
| 4. Porqué con evidencia y análisis de gancho | Cumple | Explicación restringida a la evidencia recolectada; sin evidencia válida, el tema se descarta. |
| 5. Top 10 y detalle con quiénes, cómo y por qué | Cumple | Revisado en la página publicada. |
| 6. Brief en vivo al cambiar de perfil en pocos segundos | Parcial | Funciona en la URL pública; tarda entre 10 y 13 segundos con Gemini 2.5 Flash. Si pasa de 15 segundos responde con el brief del día y lo indica. |
| 7. Fecha y costo visibles | Cumple | Ver arriba. |

## Errores y seguridad

| Punto | Estado | Evidencia |
|---|---|---|
| Fuente caída o sin cupo: usa lo último guardado y lo indica | Cumple | Caché por fuente; la portada muestra "último guardado del ..." cuando aplica. Probado con fixtures. |
| Brief que no se puede generar: mensaje claro y se conserva el anterior | Cumple | `/api/brief` responde con el brief del día o con un mensaje claro; la interfaz conserva el último brief. |
| Explicación sin evidencia no se muestra | Cumple | Prueba dedicada; además el orquestador nunca publica un radar sin temas. |
| Límite de costo por corrida | Cumple | Tope de USD 1,50; si se supera, no se escribe nada y queda el radar anterior. |
| Solo contenido público con APIs oficiales | Cumple | Ver "No incluye". |
| Sin login | Cumple | La página es pública. |
| Claves fuera del repositorio | Cumple | `.env` ignorado, secretos en GitHub y Vercel, y una prueba que revisa que ningún archivo versionado tenga claves. |

## Notas

- **Primera ejecución del flujo diario:** el radar corrió bien en GitHub, pero el último paso falló
  porque la rama avanzó mientras corría. Se corrigió para que traiga los cambios antes de subir y se
  relanzó.
- **Calidad del ranking:** las pruebas confirman que el radar funciona como está diseñado, no que el
  top sea "el correcto". Antes de la demo conviene que alguien del equipo de media revise el top 10.
