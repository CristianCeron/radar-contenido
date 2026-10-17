# Cómo obtener las claves

Hacker News (Algolia), arXiv y los feeds RSS no piden clave. El radar corre sin costo con
YouTube y Gemini. Eden AI y Anthropic son opcionales.

## 1. YouTube Data API v3 (obligatoria, gratis, 10.000 unidades al día)
1. Entra a https://console.cloud.google.com con tu cuenta de Google.
2. Menú "APIs y servicios" > "Biblioteca". Busca "YouTube Data API v3" y dale "Habilitar".
3. "APIs y servicios" > "Credenciales" > "Crear credenciales" > "Clave de API".
4. En "Restricciones de API" elige solo YouTube Data API v3. En restricciones de aplicación deja
   "Ninguno": la corrida diaria sale desde GitHub Actions, que no tiene IP fija.
5. Pega el valor en `YOUTUBE_API_KEY`.

Una búsqueda cuesta 100 unidades; con 8 búsquedas por corrida sobra cupo.

## 2. Gemini (obligatoria si LLM_PROVIDER=gemini, sin costo)
1. Entra a https://aistudio.google.com con la misma cuenta de Google.
2. "Get API key" > "Create API key" y elige el proyecto de Google Cloud.
3. Pega el valor en `GEMINI_API_KEY`.

Con `GEMINI_BACKEND=aistudio` usa el nivel gratuito, que no pide tarjeta. Ojo: si el proyecto tiene
facturación activa, AI Studio deja de dar nivel gratuito y cobra de un saldo prepagado propio; los
créditos de la prueba gratuita de Google Cloud no aplican ahí. Para el nivel gratuito, crea la clave
en un proyecto sin facturación (por ejemplo "Default Gemini Project"). El pipeline espera y reintenta
cuando el nivel gratuito responde que se alcanzó el límite de llamadas por minuto.

### Variante con créditos de Google Cloud (`GEMINI_BACKEND=vertex`)
Agent Platform (antes Vertex AI) sí consume los créditos de la prueba gratuita.
1. En Google Cloud, "APIs y servicios" > "Credenciales" > "Crear credenciales" > "Clave de API".
   Restringe la clave a Generative Language API y Agent Platform API, y vincúlala a una cuenta de servicio.
2. En "IAM y administración" > "IAM", dale a esa cuenta de servicio el rol "Usuario de Vertex AI".
3. Pega la clave en `GEMINI_API_KEY` y pon `GEMINI_BACKEND=vertex`.

## 3. Anthropic (opcional, modo calidad)
Recomendado para explicaciones y briefs más precisos. Requiere saldo prepagado.
1. Entra a https://console.anthropic.com y crea la cuenta.
2. "Billing": carga saldo. En "Limits" puedes poner un tope mensual.
3. "API Keys" > "Create Key". Pega el valor en `ANTHROPIC_API_KEY`.
4. Cambia `LLM_PROVIDER=anthropic`.

## 4. Eden AI (opcional, clasificador JEV)
JEV es un modelo de decisión de TypeSafe AI: clasifica, no redacta. Sin clave o sin saldo, el
clasificador usa el modelo rápido del proveedor elegido como respaldo.
1. Regístrate en https://app.edenai.run.
2. En el panel, "API Keys" > "Create API Key", entorno Production. Se recomienda activar un tope de gasto.
3. Pega el valor en `EDENAI_API_KEY` y carga saldo en la cuenta para que JEV responda.

## Dónde ponerlas
Copia `.env.example` como `.env` en la raíz del proyecto y pega ahí las claves.
No las pegues en el chat ni en ningún archivo que se suba al repositorio. Para la
actualización diaria (Tarea 20) se cargan como secretos de GitHub y de Vercel.
