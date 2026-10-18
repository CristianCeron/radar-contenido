# Spec: radar-contenido

## Overview
Radar de contenido que detecta qué temas de crecimiento de empresas están despegando, explica por qué y los convierte en oportunidades de contenido ajustadas a una marca concreta. Los temas se organizan por los pilares de la Inmersión 30X, el programa insignia de la marca: liderazgo y mentalidad, growth, equipos y talento, ventas, marketing, expansión internacional, fundraising e IA aplicada al negocio. La IA es un pilar más, no el centro, porque es el tema del que todos hablan y no diferencia.

Nace del reto "Radar de contenido" del Hackathon 30X, que plantea que los servicios de scraping traen datos, pero no explican por qué algo funcionó ni si encaja con la audiencia. La v1 se entrega como prototipo funcional el domingo 18 de octubre hasta las 12:00 m., hora Colombia.

## Usuarios objetivo
Equipo de contenido de una marca que debe decidir qué producir esta semana. En la v1 son dos perfiles: 30X y la voz personal de Andrés Bilbao, ambos dirigidos a founders, CEOs y ejecutivos de Latinoamérica que quieren escalar su empresa sin que dependa del fundador.

## Alcance v1
Incluye:
- Fuentes públicas en tres capas: origen (Hacker News, newsletters de expertos en growth, ventas y liderazgo por RSS, y arXiv reducido a IA y economía), difusión (YouTube) y audiencia ejecutiva (prensa de negocios, medios de startups de Latinoamérica y consultoras por RSS).
- Tema configurable: las búsquedas, los feeds, el filtro de prensa, la audiencia y los pilares viven en un archivo de configuración. El tema por defecto es crecimiento de empresas; hay uno solo de IA y uno de emprendimiento como alternativas.
- Sensor humano: el equipo reporta publicaciones que ve en LinkedIn, Instagram, TikTok o Facebook mediante un formulario de Google que alimenta una hoja de cálculo. Cada reporte suma una mención al tema (LinkedIn cuenta en la capa de audiencia ejecutiva; Instagram, TikTok y Facebook en la de difusión). El radar nunca abre esas plataformas. Basta con pegar el enlace: la plataforma se deduce del enlace y el tema se toma de la descripción opcional que escriba la persona o, si no la hay, de las palabras del enlace (LinkedIn) o del servicio oficial oEmbed (TikTok y YouTube). Para Instagram y Facebook la descripción es necesaria.
- Agrupación por tema dentro de cada pilar y un top 10 de temas que más crecen en la semana, con máximo dos temas por pilar para que ninguno se coma el ranking.
- Para cada tema: etapa (emergente, creciendo, pico o saturado) definida por en qué capas aparece y a qué velocidad crece; curva de crecimiento de los últimos 30 días; qué canales y medios públicos hablan de él; cómo lo hacen (gancho y formato) en las piezas principales; y el porqué con evidencia enlazada.
- Perfiles de marca (30X y Andrés Bilbao) con quién es, audiencia, voz, formatos y productos. Para cada tema y perfil, un brief con ángulo, formato, gancho y oportunidad de negocio ligada a un producto de la marca, elegido según el pilar del tema.
- Página pública interactiva con vista tipo mercado: lista de temas con su pilar y su variación, gráfico de crecimiento, detalle por tema y selector de perfil.
- Actualización automática diaria de los datos, de modo que la página siempre tenga información reciente.
- Fecha y hora de la última actualización y costo de esa corrida visibles en la página.
- Entregables del hackatón: demo desplegado, repositorio público con documentación y video pitch de hasta 3 minutos.

No incluye, por decisión permanente:
- Datos obtenidos por scraping de LinkedIn, Instagram o TikTok, ni ninguna técnica que viole términos de servicio.
- Datos personales de ninguna clase.

## Comportamiento
1. Cada madrugada el sistema recolecta las publicaciones recientes de las fuentes del tema y los reportes del sensor humano de los últimos 30 días, y guarda un resultado con su fecha.
2. Propone los temas dentro de cada pilar, agrupa las publicaciones, calcula su velocidad de crecimiento y asigna la etapa según las capas en las que aparece.
3. Selecciona el top 10 por velocidad y por relevancia para la audiencia, con máximo dos temas por pilar.
4. Para cada tema redacta el porqué con evidencia enlazada y analiza el gancho y el formato de las piezas principales.
5. Al abrir la página, la persona ve el top 10 con su variación y su gráfico de crecimiento. Al abrir un tema ve quiénes hablan de él, cómo lo hacen y por qué está creciendo.
6. Al cambiar de perfil, el sistema genera en vivo el brief de ese tema para esa marca en pocos segundos.
7. La página muestra la fecha y hora de la última actualización y el costo de esa corrida.

## Errores y seguridad
- Si una fuente falla o agota su cupo gratuito, la página usa el último resultado guardado y lo indica con su fecha. No se rompe.
- Si no se puede generar un brief, se muestra un mensaje claro y se conserva el brief anterior.
- Una explicación que no tenga evidencia enlazada no se muestra.
- Cada corrida tiene un límite de costo; si lo supera, se detiene y conserva el resultado anterior.

### Datos sensibles, permisos y autenticación
- Solo se usa contenido público, con APIs oficiales y feeds públicos.
- No se almacenan ni se muestran datos personales. Se muestran nombres de canales y medios públicos, no perfiles personales.
- Los enlaces del sensor humano solo se usan para deduplicar y nunca se muestran en la página ni se guardan en el resultado publicado, porque suelen contener el nombre de una persona. En la página se ve el conteo por plataforma (por ejemplo, "LinkedIn, aportes del equipo: 3") y la descripción que escribió quien lo reportó.
- La dirección de la hoja del sensor humano es un secreto, igual que las claves.
- No hay login ni cuentas de usuario.
- Las claves de acceso no se publican en el repositorio.

## Futuro (v2+)
- Abrir el sensor humano a la comunidad, con moderación.
- Leer las métricas de las cuentas propias de la marca (Instagram y LinkedIn) con sus APIs oficiales, para comparar lo que marca el radar con lo que de verdad le funciona a su audiencia.
- Más fuentes, como Product Hunt y GitHub.
- Perfiles de marca creados por cualquier usuario.
- Alertas cuando un tema pasa de emergente a creciendo.
- Medición del desempeño real de las piezas que la marca publica.
- Cobertura por país de Latinoamérica.
