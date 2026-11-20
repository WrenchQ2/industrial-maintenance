# Constitución de SERVMOTION

SERVMOTION es la herramienta con la que una empresa controla el estado y el mantenimiento de sus equipos. La ventana del técnico es la primera fase; el producto comercial se define en la spec antes de implementarse.

1. **Stack mínimo**: la app del técnico es HTML, CSS y JS vanilla en tres archivos, sin build, frameworks, CDN ni dependencias; abre con `file://`. El producto solo añade infraestructura aprobada en la spec: backend, base de datos o autenticación.
2. **Spec manda**: `AGENTS.md` y `docs/` son la spec; cada cambio actualiza spec, código y `MEMORY.md` en el mismo commit. Sin spec aprobada no hay desarrollo de producto; si divergen, gana la spec.
3. **Lógica e interfaz**: estado, validación y persistencia viven en funciones de dominio, no en el markup; `index.html` es armazón, `styles.css` presentación y `script.js` lógica y vistas.
4. **Tests sin instalar**: `node --check` en cada JS tocado y prueba real del flujo en Chrome (manual o headless/CDP) sobre `file://`; la app del técnico no usa `package.json`, npm ni test runners. En producto, `node --test` y pruebas de API con herramientas nativas.
5. **Datos protegidos**: el prototipo guarda el estado en `localStorage["servmotion.control.v1"]`, sin `fetch`, telemetría ni secretos; los datos corruptos se respaldan y los fallos se avisan. En producto, autenticación, cifrado en tránsito y borrado solo por acción explícita.
6. **Idioma**: textos, `aria-label`, mensajes, comentarios y documentación en español; identificadores según la convención del repo (verbo inglés + dominio español), sin textos de interfaz en otro idioma.

Estos principios se verifican en cada revisión; un cambio que incumpla cualquiera no se acepta.
