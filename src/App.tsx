import { lazy } from 'react'
import { Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'

// Carga diferida por página: mantiene el arranque ligero y separa las gráficas.
const DashboardPage = lazy(() =>
  import('./pages/DashboardPage').then((module) => ({ default: module.DashboardPage })),
)
const EquipmentPage = lazy(() =>
  import('./pages/EquipmentPage').then((module) => ({ default: module.EquipmentPage })),
)
const EquipmentDetailPage = lazy(() =>
  import('./pages/EquipmentDetailPage').then((module) => ({ default: module.EquipmentDetailPage })),
)
const OrdersPage = lazy(() =>
  import('./pages/OrdersPage').then((module) => ({ default: module.OrdersPage })),
)
const OrderDetailPage = lazy(() =>
  import('./pages/OrderDetailPage').then((module) => ({ default: module.OrderDetailPage })),
)
const HistoryPage = lazy(() =>
  import('./pages/HistoryPage').then((module) => ({ default: module.HistoryPage })),
)
const ReportsPage = lazy(() =>
  import('./pages/ReportsPage').then((module) => ({ default: module.ReportsPage })),
)
const AssistantPage = lazy(() =>
  import('./pages/AssistantPage').then((module) => ({ default: module.AssistantPage })),
)
const SettingsPage = lazy(() =>
  import('./pages/SettingsPage').then((module) => ({ default: module.SettingsPage })),
)
const NotFoundPage = lazy(() =>
  import('./pages/NotFoundPage').then((module) => ({ default: module.NotFoundPage })),
)

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="equipment" element={<EquipmentPage />} />
        <Route path="equipment/:id" element={<EquipmentDetailPage />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="orders/:id" element={<OrderDetailPage />} />
        <Route path="history" element={<HistoryPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="assistant" element={<AssistantPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
