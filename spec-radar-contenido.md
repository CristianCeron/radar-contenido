# Spec: radar-contenido

## Overview
Radar de contenido que detecta qué temas de IA están despegando, explica por qué y los convierte en oportunidades de contenido ajustadas a una marca concreta.

Nace del reto "Radar de contenido" del Hackathon 30X. Hoy el equipo de media depende de servicios de scraping pagos que traen datos, pero no explican por qué algo funcionó ni si encaja con la audiencia. La v1 se entrega como prototipo funcional el domingo 18 de octubre a las 11:00 am.

## Usuarios objetivo
Equipo de contenido de una marca que debe decidir qué producir esta semana. En la v1 son dos perfiles: 30X y la voz personal de Andrés Bilbao, ambos dirigidos a ejecutivos y equipos de Latinoamérica que aprenden IA.

## Alcance v1
Incluye:
- Cuatro fuentes públicas en tres capas: origen (Hacker News y arXiv), difusión (YouTube) y audiencia ejecutiva (prensa de negocios y blogs de consultoras por RSS).
- Sensor humano: el equipo reporta publicaciones que ve en LinkedIn, Instagram, TikTok o Facebook mediante un formulario de Google que alimenta una hoja de cálculo. Cada reporte suma una mención al tema (LinkedIn cuenta en la capa de audiencia ejecutiva; Instagram, TikTok y Facebook en la de difusión). El radar nunca abre esas plataformas: solo usa lo que la persona escribió.
- Agrupación por tema y un top 10 de temas que más crecen en la semana.
- Para cada tema: etapa (emergente, creciendo, pico o saturado) definida por en qué capas aparece y a qué velocidad crece; curva de crecimiento de los últimos 30 días; qué canales y medios públicos hablan de él; cómo lo hacen (gancho y formato) en las piezas principales; y el porqué con evidencia enlazada.
- Perfiles de marca (30X y Andrés Bilbao) con quién es, audiencia, voz, formatos y productos. Para cada tema y perfil, un brief con ángulo, formato, gancho y oportunidad de negocio ligada a un producto de la marca.
- Página pública interactiva con vista tipo mercado: lista de temas con su variación, gráfico de crecimiento, detalle por tema y selector de perfil.
- Actualización automática diaria de los datos, de modo que la página siempre tenga información reciente.
- Fecha de los datos y costo de la última corrida visibles en la página.
- Entregables del hackatón: URL desplegada, repositorio público con documentación y video pitch de 3 minutos.

No incluye, por decisión permanente:
- Datos obtenidos por scraping de LinkedIn, Instagram o TikTok, ni ninguna técnica que viole términos de servicio.
- Datos personales de ninguna clase.

## Comportamiento
1. Cada madrugada el sistema recolecta las publicaciones recientes de las cuatro fuentes y los reportes del sensor humano de los últimos 30 días, y guarda un resultado con su fecha.
2. Agrupa las publicaciones por tema, calcula su velocidad de crecimiento y asigna la etapa según las capas en las que aparece.
3. Selecciona el top 10 por velocidad y por relevancia para ejecutivos.
4. Para cada tema redacta el porqué con evidencia enlazada y analiza el gancho y el formato de las piezas principales.
5. Al abrir la página, la persona ve el top 10 con su variación y su gráfico de crecimiento. Al abrir un tema ve quiénes hablan de él, cómo lo hacen y por qué está creciendo.
6. Al cambiar de perfil, el sistema genera en vivo el brief de ese tema para esa marca en pocos segundos.
7. La página muestra la fecha de los datos y el costo de la última corrida.

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
