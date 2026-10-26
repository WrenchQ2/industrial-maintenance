# Industrial Maintenance AI — Frontend

Prototipo frontend de una aplicación SaaS para gestión de mantenimiento industrial. Esta fase incluye únicamente la interfaz: **no hay backend, base de datos ni modelo de IA conectados**.

## Stack

- React 19
- TypeScript 7
- Vite 8
- Tailwind CSS 4
- React Router 7
- Lucide React
- Recharts

## Requisitos

- Node.js 20.19 o superior (probado con Node 24)
- npm 10 o superior

## Cómo arrancar en Windows

Abre PowerShell en la carpeta del proyecto:

```powershell
npm install
npm run dev
```

La aplicación estará disponible en:

```text
http://localhost:5173
```

### Otros comandos

```powershell
npm run typecheck   # Comprueba TypeScript sin generar archivos
npm run build       # Compila la versión de producción en dist/
npm run preview     # Sirve la compilación local de producción
```

## Rutas

| Ruta | Página |
| --- | --- |
| `/` | Dashboard |
| `/equipment` | Inventario de equipos |
| `/equipment/:id` | Detalle del equipo |
| `/orders` | Órdenes de mantenimiento |
| `/orders/:id` | Detalle de la orden |
| `/history` | Historial de mantenimiento |
| `/reports` | Reportes técnicos |
| `/assistant` | Asistente de IA simulado |
| `/settings` | Configuración local |

## Funcionalidad implementada

- Layout responsive con barra lateral contraíble y menú móvil.
- Barra superior con búsqueda global real, notificaciones y menú de perfil.
- Dashboard con indicadores, tres gráficas y alertas de equipos.
- CRUD local de equipos con validación, búsqueda, filtros y confirmación de borrado.
- Detalle de equipo con historial, órdenes relacionadas y espacio de telemetría futura.
- Creación de órdenes, filtros y cambio de estado desde el detalle.
- Historial generado a partir de las órdenes completadas.
- Creación de borradores de reportes, filtros, vista previa y cambio de estado.
- Asistente con respuestas simuladas, indicador de procesamiento y consultas rápidas.
- Preferencias locales, restauración de datos demo y mensajes de éxito/error.
- Persistencia de demostración en `localStorage`.

## Datos de demostración

Todos los equipos, órdenes, reportes y notificaciones iniciales son ficticios. Se guardan en:

- `imai.demo.equipment.v1`
- `imai.demo.orders.v1`
- `imai.demo.reports.v1`
- `imai.demo.notifications.v1`
- `imai.demo.settings.v1`

Puedes restaurarlos desde **Configuración → Restaurar demo**. No se guardan credenciales, secretos ni datos sensibles.

## Estructura

```text
src/
  components/
    dashboard/      Tarjetas, gráficas, actividad y alertas
    equipment/      Formulario de equipos
    layout/         Sidebar, topbar, búsqueda y menús
    orders/         Formulario de órdenes
    reports/        Formulario y vista previa de reportes
    ui/             Componentes reutilizables
  config/           Navegación
  context/          Estado global de demostración
  data/             Datos ficticios centralizados
  hooks/            Hooks reutilizables
  pages/            Vistas de la aplicación
  services/         Acceso a datos local y simulación de IA
  types/            Tipos TypeScript del dominio
  utils/            Fechas, folios, estilos de estado y helpers
```

## Simulaciones y límites actuales

- Los datos no se guardan en SQL Server; viven en el navegador.
- No existe autenticación ni gestión real de usuarios.
- El asistente no está conectado a un modelo de IA. Sus respuestas son textos precargados.
- No hay lectura de sensores ni telemetría real.
- No se suben fotografías ni se generan PDF/Word.
- No hay llamadas HTTP a endpoints inexistentes.

## Siguiente fase sugerida

1. Implementar FastAPI y SQL Server.
2. Sustituir los métodos de `src/services/*` por llamadas HTTP tipadas.
3. Añadir autenticación y permisos por rol.
4. Conectar el asistente mediante un endpoint backend que proteja las credenciales del proveedor.
5. Incorporar carga de imágenes y generación de reportes.
6. Integrar telemetría real con fuentes autorizadas.
