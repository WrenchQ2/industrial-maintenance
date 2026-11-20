# MEMORY.md — Diario de Estudio
Memoria del proyecto entre sesiones. Máximo ~50 líneas: resume o elimina lo que ya no aporte.
## Estado actual
- Prototipo frontend estático funcionando con `file://`, sin backend ni dependencias.
- Inicio v2 con glassmorphism, KPIs y gráficas circulares; shell y resto de vistas coherentes.
- **Equipos** sustituye a “Mis equipos”: cola activa del técnico (Asignado, En diagnóstico, Por reparar), columna **Vendedor**, búsqueda por vendedor y filtro por estado.
- Nuevo estado `repair` (“Por reparar”, tono violeta). `diagnosed` sigue siendo “Diagnosticado” y queda fuera de la cola.
- Demo ampliada a 3 equipos: `EQ-001` asignado, `EQ-002` finalizado y `EQ-003` por reparar (FANUC, autorizado y con materiales completos).
- Vendedores ficticios: Mariana Cortés (`EQ-001`, `EQ-003`) y Diego Fuentes (`EQ-002`).
- Diagnósticos seed: `DIA-0001` (EQ-002) y `DIA-0002` (EQ-003, finalizado y bloqueado).
- Inicio muestra el panel “Equipos”, el botón “Ver pendientes”, la nota “Pendiente de reparación” y el bloque “Equipo por reparar” en Siguiente paso.
- `EQ-003` muestra **Iniciar reparación** (tabla, dashboard, hero y expediente) y abre `#/reparacion/EQ-003` con el diagnóstico en solo lectura; no hay campos editables.
- Formulario de diagnóstico editable con pestañas A-D: un bloque visible, navegación Anterior/Siguiente, chips de avance clicables y salto al bloque del primer error. La vista previa y el diagnóstico finalizado siguen apilados.
- `contenidored/` sincronizado con hashes idénticos; `AGENTS.md` y esta memoria actualizados.
- Rama `servmotion-tecnico`; commits `ba94725` (pestañas) y `18baac2` (constitución) publicados.
- Constitución en `docs/constitution.md`: 6 principios innegociables (stack, spec, lógica/interfaz, tests, datos e idioma).
- La ventana del técnico es la fase 1; el producto comercial se especifica antes de implementarse.
## Decisiones (y por qué)
- `repair` es un estado propio porque el flujo real es: vendedor autoriza → compras registra materiales → asignación al técnico → el técnico repara.
- `WORK_QUEUE_STATUSES = ['assigned', 'diagnosing', 'repair']`: la cola no mezcla equipos ya diagnosticados ni cerrados.
- El alcance de esta fase es solo la cola del técnico; no existen vistas de vendedor, compras ni materiales.
- La reparación usa una ruta propia (`#/reparacion/:id`) y `renderReadonlySections`; así se reutiliza la vista protegida sin abrir el formulario editable.
- Para equipos `repair` se omite “Ver diagnóstico” porque el diagnóstico se consulta dentro de la propia reparación.
- `ensureDemoState()` migra `localStorage` antiguo (vendedores, `EQ-003` y su diagnóstico) sin borrar diagnósticos, borradores, historial, documentos ni notas; usa `nextSequentialId` si `DIA-0002` está ocupado.
- Las pestañas se aplican solo al formulario editable; la vista previa y el diagnóstico finalizado conservan las secciones A-D apiladas.
- Los cuatro paneles permanecen en el DOM y el inactivo solo se oculta con `hidden`; así los campos ocultos siguen en el borrador y se autoguardan sin cambios.
- Los textos del dashboard pueden seguir mostrando Diagnosticado/Finalizado: son resumen global, no la cola.
## Aprendizajes y errores a evitar
- No renombrar `data-action`, `data-field`, `data-sync`, `data-route` ni IDs: los manejadores dependen de ellos.
- Al añadir un estado, revisar `EQUIPMENT_STATUS`, `actionsForEquipment`, `notificationItems`, dashboard e historial.
- Probar overflow horizontal en 1440/1024/900/768/390 px; la tabla de Equipos usa `min-width: 920px` y scroll interno.
- `filterEquipmentTable()` debe usar `queueEquipment()`, no `ownEquipment()`, para no reintroducir equipos cerrados.
- La ruta `#/reparacion/:id` debe exigir técnico propietario y `status === 'repair'`; verifica que dentro de `#app` haya 0 `input`, `select`, `textarea`, `form` y `data-field`.
- Al añadir o renombrar secciones, actualizar `DIAG_BLOCKS`, `diagnosticSectionForPath`, `progressChipsHtml` y los IDs `diag-tab-*`/`seccion-*`.
- Los paneles ocultos no deben eliminarse del DOM: la validación y el autoguardado necesitan todos los campos.
- En móvil, la barra de acciones sticky tapaba las pestañas; bajo `760px` debe ser `position: static`.
- Al modificar la raíz, sincronizar `contenidored/` y comparar hashes; la copia debe seguir siendo espejo.
## Próximos pasos
- Recoger feedback visual de las pestañas del diagnóstico, la cola de Equipos y la vista de reparación.
- Fase futura: pantallas de vendedor/compras, autorización, materiales y transición a `repair`.
- Futuro: registro/cierre de la reparación y transición a un estado reparado.
- Mantener `contenidored/` y `AGENTS.md` sincronizados tras cambios futuros.
