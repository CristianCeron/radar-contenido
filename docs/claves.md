# Cómo obtener las claves

Hacker News (Algolia), arXiv y los feeds RSS no piden clave. Solo hacen falta tres.

## 1. YouTube Data API v3 (gratis, 10.000 unidades al día)
1. Entra a https://console.cloud.google.com con tu cuenta de Google.
2. Crea un proyecto nuevo (por ejemplo "radar-contenido").
3. Menú "APIs y servicios" > "Biblioteca". Busca "YouTube Data API v3" y dale "Habilitar".
4. "APIs y servicios" > "Credenciales" > "Crear credenciales" > "Clave de API".
5. Edita la clave y en "Restricciones de API" deja solo YouTube Data API v3.
6. Pega el valor en `YOUTUBE_API_KEY`.

Una búsqueda cuesta 100 unidades; con 10 temas por corrida sobra cupo.

## 2. Eden AI (clasificador)
1. Regístrate en https://app.edenai.run.
2. En el panel, sección "API Keys", copia la clave.
3. Pega el valor en `EDENAI_API_KEY`. Trae crédito de prueba.

## 3. Anthropic (redacción de temas, explicaciones y briefs)
1. Entra a https://console.anthropic.com y crea la cuenta.
2. "Settings" > "Billing": carga unos USD 5. Una corrida diaria debería costar centavos.
3. "API Keys" > "Create Key". Pega el valor en `ANTHROPIC_API_KEY`.

## Dónde ponerlas
Copia `.env.example` como `.env` en la raíz del proyecto y pega ahí las tres claves.
No las pegues en el chat ni en ningún archivo que se suba al repositorio. Para la
actualización diaria (Tarea 20) se cargan como secretos de GitHub y de Vercel.
