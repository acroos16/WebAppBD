import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Radar from './pages/Radar'
import GoNoGo from './pages/GoNoGo'
import Workspace from './pages/Workspace'
import Pipeline from './pages/Pipeline'

const pageMeta = {
  '/':          { title: 'Radar',       subtitle: 'Ingresa y analiza nuevas convocatorias con IA' },
  '/gonogo':    { title: 'Go / No-Go',  subtitle: 'Evalúa la viabilidad de cada oportunidad' },
  '/workspace': { title: 'Workspace',   subtitle: 'Desarrolla y gestiona propuestas en diseño' },
  '/pipeline':  { title: 'Pipeline',    subtitle: 'Vista global de todas las oportunidades activas' },
}

function Layout() {
  const { pathname } = useLocation()
  const meta = pageMeta[pathname] ?? { title: 'CARE Fondos', subtitle: '' }

  return (
    <div className="flex min-h-screen bg-[#f5f5f3]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        {/* Page header */}
        <header className="bg-[#f5f5f3] border-b border-gray-100 px-8 py-4">
          <h1 className="text-lg font-semibold text-gray-900 tracking-tight">{meta.title}</h1>
          <p className="text-xs text-gray-400 mt-0.5 font-medium">{meta.subtitle}</p>
        </header>

        {/* Page content */}
        <main className="flex-1 px-8 py-6 overflow-y-auto">
          <Routes>
            <Route path="/"          element={<Radar />} />
            <Route path="/gonogo"    element={<GoNoGo />} />
            <Route path="/workspace" element={<Workspace />} />
            <Route path="/pipeline"  element={<Pipeline />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Layout />
    </BrowserRouter>
  )
}
