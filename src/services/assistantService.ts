import { simulateLatency } from './storage'

const demoDisclaimer =
  'Esta es una respuesta simulada de demostración. Verifica siempre los pasos con el manual del fabricante y los procedimientos de seguridad de tu planta.'

const responses = {
  report: `Para preparar un reporte de mantenimiento, estructura la información así:

1. Identificación: equipo, código, ubicación y fecha de la intervención.
2. Síntoma o hallazgo: describe lo observado sin asumir una causa que no hayas comprobado.
3. Actividades realizadas: inspecciones, mediciones, ajustes o repuestos utilizados.
4. Resultados: estado final del equipo y pruebas efectuadas.
5. Recomendaciones: seguimiento, repuestos o revisiones pendientes.
6. Evidencias: fotografías y referencias técnicas cuando estén disponibles.

En esta demostración puedes crear un borrador desde la sección Reportes técnicos. No se genera aún un PDF ni se envía a un servidor.

${demoDisclaimer}`,
  history: `Para resumir el historial de un servomotor, reúne primero:

- Órdenes y fechas de las últimas intervenciones.
- Alarmas registradas y condiciones en las que aparecieron.
- Actividades correctivas y repuestos sustituidos.
- Parámetros modificados y resultado de las pruebas posteriores.
- Observaciones del fabricante o del manual técnico.

En esta demo no tengo acceso a los datos históricos reales del equipo. La sección Historial de mantenimiento muestra las órdenes completadas de demostración que puedes consultar.

${demoDisclaimer}`,
  encoder: `Ante una falla de encoder, no sustituyas componentes sin confirmar la causa. Una secuencia de revisión segura puede incluir:

1. Aplicar el bloqueo y etiquetado correspondiente antes de intervenir.
2. Registrar la alarma exacta y las condiciones de operación.
3. Inspeccionar conector, cableado, apantallamiento y fijaciones del encoder.
4. Comprobar el acoplamiento y el juego mecánico según el procedimiento del fabricante.
5. Revisar parámetros y referencias de posición sin alterar valores no documentados.
6. Validar la reparación con pruebas sin carga cuando sea posible.

No continúes si el equipo presenta riesgo eléctrico o mecánico sin las medidas de seguridad de tu planta.

${demoDisclaimer}`,
  manual: `Para consultar un manual técnico de forma ordenada:

1. Identifica fabricante, modelo y número de serie exactos.
2. Localiza la sección de seguridad y las advertencias aplicables.
3. Busca códigos de alarma, esquemas de conexión y procedimientos de diagnóstico.
4. Contrasta la versión del manual con la del equipo instalado.
5. Documenta la página o referencia consultada en el reporte.

La consulta de manuales todavía no está conectada en esta versión. Puedes usar el buscador de equipos para localizar la ficha del equipo y consultar sus datos de demostración.

${demoDisclaimer}`,
  default: `Puedo ayudarte a estructurar una consulta técnica de mantenimiento.

Para obtener una orientación útil, incluye:

- Equipo, fabricante y modelo.
- Síntoma o alarma observada.
- Condiciones en las que ocurre.
- Comprobaciones ya realizadas.
- Documentación técnica disponible.

En esta demostración no hay un modelo de IA conectado ni acceso a telemetría real. La interfaz está preparada para integrarse con una API en una fase posterior.

${demoDisclaimer}`,
}

/** Capa de servicio simulada, preparada para sustituirse por una llamada a FastAPI. */
export const assistantService = {
  async sendQuestion(question: string): Promise<string> {
    await simulateLatency(1100)
    const text = question.toLowerCase()

    if (text.includes('reporte') || text.includes('informe')) return responses.report
    if (text.includes('historial') || text.includes('servomotor')) return responses.history
    if (text.includes('encoder')) return responses.encoder
    if (text.includes('manual')) return responses.manual
    return responses.default
  },
}
