# MEMORY.md — Diario de Estudio
Memoria del proyecto entre sesiones. Máximo ~50 líneas: resume o elimina lo que ya no aporte.
## Estado actual
- Prototipo frontend estático funcionando con `file://`, sin backend ni dependencias.
- Inicio rediseñado (v2): hero azul marino, anillo de cierre, KPIs con gráficas circulares (donas), tarjetas de equipo con más jerarquía, panel "Continuar trabajo", actividad y accesos rápidos.
- Glassmorphism reforzado en el Inicio: halos ambientales, paneles translúcidos con `backdrop-filter`, brillo diagonal, bordes luminosos y fallback opaco.
- Resto de vistas y shell (sidebar/topbar) sin cambios. `index.html` intacto.
- `contenidored/` sincronizado con la raíz: los tres archivos tienen el mismo SHA-256 y la copia se validó abriéndola con `file://`.
- Publicado en GitHub: rama `servmotion-tecnico` de `WrenchQ2/industrial-maintenance` (commit `e3f986f`); `main` conserva la app React anterior.
## Decisiones (y por qué)
- Sin backend ni dependencias: cualquiera debe poder abrirlo con doble clic para modificación de vista de las pantallas del tecnico.
- Demo funcional para realizar cambios e implementarlo realmente despues de finalizar con la modificación de dicha pantalla.
- Estilos del nuevo Inicio aislados bajo `.dashboard-view` para no afectar otras vistas.
- Gráficas circulares con `conic-gradient` y el helper `conicChart`; usan datos reales (estados, cierres y semanas) y evitan librerías. El avance del borrador también es un medidor circular.
- El vidrio se apoya en un fondo con halos cian/azul: sin color detrás, `backdrop-filter` apenas se percibe.
- El CTA del hero conserva el flujo: inicia/continúa diagnóstico vía `data-action="start-diagnostic"`.
## Aprendizajes y errores a evitar
- No renombrar `data-action`, `data-field`, `data-sync` ni IDs: los manejadores dependen de ellos.
- Verificar overflow horizontal a 1440/1024/900/768/390 px; hay scrollbars que recortan 15 px el ancho útil.
- Probar preferencias extremas (texto grande + densidad compacta) en móvil.
- Al usar `backdrop-filter`, incluir prefijo `-webkit-` y un fallback con `@supports` para navegadores sin soporte.
- En donas con `conic-gradient`, omitir segmentos en cero y añadir `role="img"` con `aria-label` descriptivo; el centro va `aria-hidden`.
## Próximos pasos
- Recoger feedback visual del usuario sobre el nuevo Inicio.
- Mantener `contenidored/` sincronizado tras cualquier cambio futuro en la raíz.
