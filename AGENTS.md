# AGENTS.md

## Contexto

- Prototipo frontend estático de 3 archivos: `index.html`, `styles.css` y `script.js`. No hay backend, build, package manager ni tests (sí existe repo git en la carpeta).
- Debe funcionar abriendo `index.html` directamente con doble clic (`file://`). No introduzcas `fetch`, módulos ES, frameworks, CDN ni dependencias externas.
- Toda la interfaz, textos, `aria-label` y comentarios están en español. Mantén ese idioma.
- La constitución del proyecto vive en `docs/constitution.md`; sus 6 principios son innegociables y se verifican en cada cambio.

## Estructura

- `index.html`: shell fijo con sprite SVG, sidebar, topbar, `#app`, modales y toasts. Las vistas se inyectan en `#app`.
- `styles.css`: estilos globales. El breakpoint móvil es `900px` y debe coincidir con `isMobileMenu()` de `script.js`.
- `script.js`: IIFE con router por hash, estado y todas las vistas. No usa módulos; no muevas código fuera de la IIFE sin necesidad.
- `contenidored/`: copia comentada byte a byte de los tres archivos. No es la fuente; edita en la raíz y replica allí si se pide conservar la copia.
- `referencia/guia.png`: imagen de referencia; no forma parte de la aplicación.

## Comandos y verificación

- Comprobar sintaxis: `node --check script.js` (y también `node --check contenidored/script.js` si se toca la copia).
- No hay servidor ni suite de tests. Verifica abriendo `index.html` o con Chrome headless/CDP.
- Rutas principales: `#/inicio`, `#/equipos`, `#/diagnosticos`, `#/expediente/EQ-001/resumen`, `#/historial`, `#/documentos`, `#/configuracion`.

## Estado y datos

- Persistencia: `localStorage["servmotion.control.v1"]`. Para restaurar el seed, borra esa clave o el almacenamiento del navegador.
- La demo es intencionalmente pequeña: 3 equipos (`EQ-001` asignado, `EQ-002` finalizado y `EQ-003` por reparar), 2 diagnósticos seed (`DIA-0001` de `EQ-002` y `DIA-0002` de `EQ-003`, ambos finalizados) y vendedores ficticios (Mariana Cortés y Diego Fuentes). No añadas datos sin revisar los textos y contadores.
- La vista **Equipos** muestra solo la cola activa del técnico: Asignado, En diagnóstico y Por reparar (`WORK_QUEUE_STATUSES`). Diagnosticado y Finalizado quedan fuera de esa vista, pero siguen en Inicio, Diagnósticos e Historial.
- **Por reparar** (`repair`) es un estado propio para equipos ya autorizados por el vendedor y con materiales completos. El flujo real de autorización, compras y asignación no está implementado en esta fase.
- **Iniciar reparación** abre `#/reparacion/:equipmentId`, una vista con el diagnóstico `DIA-0002` de referencia en modo solo lectura (`renderReadonlySections`). El técnico no puede editar el registro; el equipo permanece en `repair` porque no existe cierre de reparación en esta fase.
- `ensureDemoState()` completa datos guardados antiguos (vendedores, `EQ-003` y su diagnóstico si falta) sin borrar diagnósticos, historial, documentos ni notas. Si `DIA-0002` ya existe para otro equipo, usa el siguiente ID secuencial.
- Diagnóstico: 19 campos obligatorios repartidos en las secciones A-D. El formulario editable las muestra como pestañas (solo un bloque visible) con navegación Anterior/Siguiente y chips de avance; al finalizar con errores se abre el bloque del primer campo inválido. La vista previa y el diagnóstico finalizado mantienen las secciones apiladas. La sincronía usa 6 filas y de 1 a 64 polos; exige valores positivos y conserva las columnas ocultas al reducir polos.
- No hay autenticación real: "Cerrar sesión" es solo informativo. Los documentos y el pinout de ejemplo se generan en el navegador con `Blob`/data URLs.

## Cuidados al editar

- El JS depende de atributos `data-action`, `data-field`, `data-sync`, `data-route` y de IDs concretos. No los renombres sin actualizar los manejadores.
- Mantén los comentarios explicativos existentes; documentan la intención de cada bloque del prototipo.
- Evita tocar `contenidored/` y la raíz por separado: si cambias la app y la copia debe seguir siendo espejo, actualiza ambos y vuelve a comparar.

## Limites
- Siempre actualiza `MEMORY.md` al terminar cada tarea-

## Memoria

- Al empezar, lee `MEMORY.md` para conocer el estado del proyecto y las decisiones tomadas.
- Al terminar una tarea, actualízalo: estado actual, decisiones importantes (con su porqué) y errores a evitar.
- Mantenlo breve (máximo ~50 líneas): resume o elimina lo que ya no aporte.
- Si algo se convierte en una regla permanente, propón moverlo a `AGENTS.md` en lugar de dejarlo en la memoria.
- No guardes nunca datos sensibles (claves, tokens, datos personales).