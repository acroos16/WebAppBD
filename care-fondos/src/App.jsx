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
    <div className="flex min-h-screen bg-[#f6f8fa]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        {/* Page header estilo GitHub Repo */}
        <header className="bg-[#f6f8fa] border-b border-[#d0d7de] px-8 py-6">
          <h1 className="text-2xl font-semibold text-[#24292f] tracking-tight">{meta.title}</h1>
          <p className="text-sm text-[#57606a] mt-1">{meta.subtitle}</p>
        </header>

        {/* Page content encapsulado en un contenedor tipo "repositorio" */}
        <main className="flex-1 p-8 overflow-y-auto">
          <div className="bg-white border border-[#d0d7de] rounded-md shadow-sm min-h-full">
            <Routes>
              <Route path="/"          element={<Radar />} />
              <Route path="/gonogo"    element={<GoNoGo />} />
              <Route path="/workspace" element={<Workspace />} />
              <Route path="/pipeline"  element={<Pipeline />} />
            </Routes>
          </div>
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