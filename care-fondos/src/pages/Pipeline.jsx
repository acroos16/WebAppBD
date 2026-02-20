import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

// ─── Helpers ──────────────────────────────────────────────
function formatMoney(n) {
  if (!n && n !== 0) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

function formatDate(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ─── Config de estados ────────────────────────────────────
const ESTADOS = [
  { value: 'Radar',         label: 'Radar',         color: 'bg-gray-100 text-gray-600'    },
  { value: 'En Evaluación', label: 'En Evaluación', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'En Diseño',     label: 'En Diseño',     color: 'bg-blue-100 text-blue-700'    },
  { value: 'Presentada',    label: 'Presentada',    color: 'bg-purple-100 text-purple-700' },
  { value: 'Aprobada',      label: 'Aprobada',      color: 'bg-green-100 text-green-700'  },
  { value: 'Archivada',     label: 'Archivada',     color: 'bg-red-100 text-red-600'      },
]

const ESTADO_MAP = Object.fromEntries(ESTADOS.map(e => [e.value, e]))

// ─── KPI Card ─────────────────────────────────────────────
function KpiCard({ label, value, sub, color = 'text-gray-900' }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

// ─── Badge de estado ──────────────────────────────────────
function EstadoBadge({ estado }) {
  const cfg = ESTADO_MAP[estado] ?? { label: estado, color: 'bg-gray-100 text-gray-600' }
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-medium ${cfg.color}`}>
      {cfg.label}
    </span>
  )
}

// ─── Selector de estado inline ────────────────────────────
function SelectorEstado({ propuestaId, estadoActual, onCambio }) {
  const [open, setOpen] = useState(false)
  const cfg = ESTADO_MAP[estadoActual] ?? { label: estadoActual, color: 'bg-gray-100 text-gray-600' }

  const cambiar = async (nuevoEstado) => {
    setOpen(false)
    if (nuevoEstado === estadoActual) return
    await supabase.from('propuestas').update({ estado: nuevoEstado }).eq('id', propuestaId)
    onCambio()
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${cfg.color} hover:opacity-80 transition-opacity`}
      >
        {cfg.label}
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1 z-20 bg-white rounded-xl border border-gray-200 shadow-lg py-1 min-w-36">
            {ESTADOS.map(e => (
              <button
                key={e.value}
                onClick={() => cambiar(e.value)}
                className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 transition-colors ${e.value === estadoActual ? 'font-semibold' : ''}`}
              >
                <span className={`inline-flex px-2 py-0.5 rounded-md font-medium ${e.color}`}>{e.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────
export default function Pipeline() {
  const [propuestas, setPropuestas] = useState([])
  const [fetching, setFetching]     = useState(true)
  const [filtroEstado, setFiltro]   = useState('Todas')
  const [busqueda, setBusqueda]     = useState('')

  const cargar = async () => {
    setFetching(true)
    const { data } = await supabase
      .from('propuestas')
      .select('*')
      .order('created_at', { ascending: false })
    setPropuestas(data ?? [])
    setFetching(false)
  }

  useEffect(() => { cargar() }, [])

  // ── KPIs ─────────────────────────────────────────────────
  const presentadas  = propuestas.filter(p => p.estado === 'Presentada')
  const aprobadas    = propuestas.filter(p => p.estado === 'Aprobada')
  const activas      = propuestas.filter(p => !['Archivada'].includes(p.estado))
  const totalPresentado = presentadas.reduce((acc, p) => acc + (p.presupuesto_total || 0), 0)
  const totalAprobado   = aprobadas.reduce((acc, p)   => acc + (p.presupuesto_total || 0), 0)
  const totalEnviadas   = presentadas.length + aprobadas.length
  const winRate = totalEnviadas > 0 ? Math.round((aprobadas.length / totalEnviadas) * 100) : 0

  // ── Filtro ────────────────────────────────────────────────
  const propuestasFiltradas = propuestas
    .filter(p => filtroEstado === 'Todas' || p.estado === filtroEstado)
    .filter(p => {
      const q = busqueda.toLowerCase()
      return !q || p.titulo?.toLowerCase().includes(q) || p.donante?.toLowerCase().includes(q)
    })

  if (fetching) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
        </svg>
        Cargando pipeline...
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          label="Propuestas activas"
          value={activas.length}
          sub={`${propuestas.length} en total`}
        />
        <KpiCard
          label="Presupuesto presentado"
          value={formatMoney(totalPresentado)}
          sub={`${presentadas.length} propuesta${presentadas.length !== 1 ? 's' : ''}`}
          color="text-purple-700"
        />
        <KpiCard
          label="Fondos ganados"
          value={formatMoney(totalAprobado)}
          sub={`${aprobadas.length} aprobada${aprobadas.length !== 1 ? 's' : ''}`}
          color="text-green-700"
        />
        <KpiCard
          label="Win Rate"
          value={winRate + '%'}
          sub={`${aprobadas.length} de ${totalEnviadas} enviadas`}
          color={winRate >= 50 ? 'text-green-700' : winRate > 0 ? 'text-yellow-600' : 'text-gray-400'}
        />
      </div>

      {/* Barra de estados */}
      {propuestas.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Distribución por estado</p>
          <div className="flex gap-1 h-3 rounded-full overflow-hidden">
            {ESTADOS.map(e => {
              const count = propuestas.filter(p => p.estado === e.value).length
              const pct   = propuestas.length > 0 ? (count / propuestas.length) * 100 : 0
              if (pct === 0) return null
              const barColor = {
                'Radar':         'bg-gray-300',
                'En Evaluación': 'bg-yellow-400',
                'En Diseño':     'bg-blue-400',
                'Presentada':    'bg-purple-400',
                'Aprobada':      'bg-green-500',
                'Archivada':     'bg-red-300',
              }[e.value] ?? 'bg-gray-300'
              return <div key={e.value} className={`${barColor} transition-all`} style={{ width: pct + '%' }} title={`${e.label}: ${count}`} />
            })}
          </div>
          <div className="flex flex-wrap gap-3 mt-3">
            {ESTADOS.map(e => {
              const count = propuestas.filter(p => p.estado === e.value).length
              if (count === 0) return null
              return (
                <span key={e.value} className="flex items-center gap-1.5 text-xs text-gray-500">
                  <span className={`w-2 h-2 rounded-full ${
                    { 'Radar':'bg-gray-300','En Evaluación':'bg-yellow-400','En Diseño':'bg-blue-400',
                      'Presentada':'bg-purple-400','Aprobada':'bg-green-500','Archivada':'bg-red-300' }[e.value]
                  }`} />
                  {e.label} ({count})
                </span>
              )
            })}
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 items-center">
        <input
          type="text"
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar por título o donante..."
          className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-56"
        />
        <div className="flex gap-1 flex-wrap">
          {['Todas', ...ESTADOS.map(e => e.value)].map(e => (
            <button
              key={e}
              onClick={() => setFiltro(e)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                filtroEstado === e
                  ? 'bg-gray-800 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {e}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla */}
      {propuestasFiltradas.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-white p-8 text-center">
          <p className="text-sm text-gray-400">
            {propuestas.length === 0 ? 'Aún no hay propuestas registradas. Ingresa la primera desde el Radar.' : 'Sin resultados para este filtro.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Propuesta</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Donante</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Presupuesto</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">ICR</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Match</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Ingreso</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {propuestasFiltradas.map(p => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800 max-w-xs truncate" title={p.titulo}>{p.titulo || '—'}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{p.donante || '—'}</td>
                  <td className="px-4 py-3 text-right font-medium text-gray-700">{formatMoney(p.presupuesto_total)}</td>
                  <td className="px-4 py-3 text-center text-gray-500">{p.icr_permitido != null ? p.icr_permitido + '%' : '—'}</td>
                  <td className="px-4 py-3 text-center">
                    {p.requiere_match
                      ? <span className="text-xs font-medium text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md">Sí</span>
                      : <span className="text-gray-300 text-xs">No</span>}
                  </td>
                  <td className="px-4 py-3">
                    <SelectorEstado propuestaId={p.id} estadoActual={p.estado} onCambio={cargar} />
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(p.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

    </div>
  )
}
