# Sensor humano

El equipo reporta publicaciones que ve en LinkedIn, Instagram, TikTok, Facebook o YouTube. Cada
reporte suma una mención al tema en el radar. El radar nunca abre esas redes ni guarda el enlace en
la página: solo cuenta el reporte y usa la descripción.

## Crear el formulario (una sola vez, 5 minutos)

1. Entra a https://forms.google.com con la cuenta del equipo y crea un formulario en blanco.
   Título sugerido: "Radar 30X: ¿qué viste en redes?". Descripción sugerida: "Pega el enlace de
   una publicación sobre crecimiento de empresas (mentalidad, growth, equipos, ventas, marketing,
   expansión, fundraising o IA aplicada) que viste en LinkedIn, Instagram, TikTok, Facebook o
   YouTube. Suma al radar de contenido."
2. Pregunta 1: **Enlace de la publicación**, tipo "Respuesta corta", obligatoria.
3. Pregunta 2: **¿De qué trata? (una línea)**, tipo "Respuesta corta", opcional.
4. En la pestaña **Respuestas**, haz clic en **Vincular a Hojas de cálculo** y crea una hoja nueva.
5. En esa hoja: **Archivo > Compartir > Publicar en la web**. Elige la pestaña de respuestas,
   formato **Valores separados por comas (.csv)** y dale **Publicar**. Copia el enlace.
6. Pega ese enlace en el `.env` en `SENSOR_SHEET_CSV_URL=`. Para la actualización diaria también va
   como secreto de GitHub con el mismo nombre.

El enlace publicado permite leer la hoja a quien lo tenga, por eso se maneja como secreto y no se
pone en el repositorio.

## Cómo reportar

Pega el enlace en el formulario. Eso basta en la mayoría de casos:

- **LinkedIn:** el radar toma el tema de las palabras del enlace (sin el nombre de usuario).
- **TikTok y YouTube:** el radar pide el título al servicio oficial oEmbed de la plataforma.
- **Instagram y Facebook:** no dan información sin una app aprobada, así que escribe de qué trata.
  Sin descripción, el reporte se omite.

Si escribes la descripción, el radar usa la tuya en vez de deducirla. Una línea concreta funciona
mejor: "Gerente cuenta cómo usa agentes de IA para cerrar ventas".

## Qué hace el radar con cada reporte

- Lo cuenta en la capa de su plataforma: LinkedIn en audiencia ejecutiva; Instagram, TikTok,
  Facebook y YouTube en difusión.
- Ignora reportes repetidos (mismo enlace) y los de más de 30 días.
- En la página se ve, por ejemplo, "LinkedIn, aportes del equipo (3)", sin enlaces.
- La descripción ayuda a explicar por qué crece el tema, pero nunca cuenta como evidencia enlazada.
- Si la hoja no responde, usa la última versión guardada.
