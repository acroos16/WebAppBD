import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

// ─── Helpers ──────────────────────────────────────────────
function formatMoney(n) {
  if (!n) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

// ─── Dimensiones de la matriz ─────────────────────────────
const DIMENSIONES = [
  {
    key: 'financiero',
    label: 'Aspectos Financieros',
    preguntas: [
      '¿El presupuesto supera USD 200,000?',
      '¿El ICR cubre al menos el 10% de costos indirectos?',
      '¿La contrapartida requerida es asumible?',
    ],
  },
  {
    key: 'operativo',
    label: 'Capacidad Operativa',
    preguntas: [
      '¿Tenemos presencia en la zona geográfica requerida?',
      '¿El equipo técnico tiene disponibilidad en el plazo?',
      '¿Los plazos de elaboración son suficientes?',
    ],
  },
  {
    key: 'desarrollo',
    label: 'Capacidad para Desarrollar',
    preguntas: [
      '¿Tenemos expertise técnico en las áreas temáticas?',
      '¿Contamos con socios estratégicos si se requiere consorcio?',
    ],
  },
  {
    key: 'probabilidad',
    label: 'Probabilidad de Éxito',
    preguntas: [
      '¿Hemos ganado propuestas con este donante antes?',
      '¿Nuestro perfil institucional encaja con los criterios?',
    ],
  },
  {
    key: 'pertinencia',
    label: 'Pertinencia Estratégica',
    preguntas: [
      '¿La oportunidad se alinea con el plan estratégico de CARE?',
      '¿Contribuye a las metas de género e inclusión?',
    ],
  },
]

// ─── Score visual: 3 opciones por pregunta ────────────────
const OPCIONES = [
  { value: 0, label: 'No', color: 'bg-red-100 text-red-700 border-red-200' },
  { value: 1, label: 'Parcial', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  { value: 2, label: 'Sí', color: 'bg-green-100 text-green-700 border-green-200' },
]

function MatrizGonogo({ scores, onChange }) {
  return (
    <div className="space-y-5">
      {DIMENSIONES.map(dim => (
        <div key={dim.key} className="bg-gray-50 rounded-xl p-4 space-y-3">
          <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">{dim.label}</p>
          {dim.preguntas.map((pregunta, i) => {
            const scoreKey = `${dim.key}_${i}`
            const current = scores[scoreKey] ?? null
            return (
              <div key={i} className="flex items-start justify-between gap-4">
                <p className="text-sm text-gray-600 flex-1">{pregunta}</p>
                <div className="flex gap-1 flex-shrink-0">
                  {OPCIONES.map(op => (
                    <button
                      key={op.value}
                      onClick={() => onChange(scoreKey, op.value)}
                      className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-all ${
                        current === op.value
                          ? op.color + ' ring-2 ring-offset-1 ring-current'
                          : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {op.label}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

// ─── Panel derecho: detalle de propuesta ──────────────────
function DetallePropuesta({ propuesta, onGo, onNoGo, loading }) {
  const [scores, setScores] = useState({})

  const handleScore = (key, value) => setScores(prev => ({ ...prev, [key]: value }))

  const totalPreguntas = DIMENSIONES.reduce((acc, d) => acc + d.preguntas.length, 0)
  const respondidas    = Object.keys(scores).length
  const puntaje        = Object.values(scores).reduce((a, b) => a + b, 0)
  const maxPuntaje     = totalPreguntas * 2
  const porcentaje     = Math.round((puntaje / maxPuntaje) * 100)

  return (
    <div className="flex-1 min-w-0 space-y-5 overflow-y-auto">
      {/* Info card */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-base font-semibold text-gray-900">{propuesta.titulo}</h2>
        <p className="text-sm text-gray-500 mt-0.5">{propuesta.donante}</p>
        <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-400">Presupuesto</p>
            <p className="font-semibold text-gray-800">{formatMoney(propuesta.presupuesto_total)}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-400">ICR</p>
            <p className="font-semibold text-gray-800">{propuesta.icr_permitido != null ? propuesta.icr_permitido + '%' : '—'}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-400">Match</p>
            <p className="font-semibold text-gray-800">{propuesta.requiere_match ? 'Sí' : 'No'}</p>
          </div>
        </div>
        {propuesta.prioridades_estrategicas && (
          <p className="mt-3 text-xs text-gray-500 leading-relaxed">{propuesta.prioridades_estrategicas}</p>
        )}
      </div>

      {/* Puntaje resumen */}
      {respondidas > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
          <div className="flex-1">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Puntaje de viabilidad</span>
              <span>{puntaje}/{maxPuntaje} ({porcentaje}%)</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  porcentaje >= 70 ? 'bg-green-500' : porcentaje >= 40 ? 'bg-yellow-400' : 'bg-red-400'
                }`}
                style={{ width: porcentaje + '%' }}
              />
            </div>
          </div>
          <span className={`text-xs font-semibold px-2 py-1 rounded-md ${
            porcentaje >= 70 ? 'bg-green-100 text-green-700' : porcentaje >= 40 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
          }`}>
            {porcentaje >= 70 ? 'Viable' : porcentaje >= 40 ? 'Dudoso' : 'Difícil'}
          </span>
        </div>
      )}

      {/* Matriz */}
      <MatrizGonogo scores={scores} onChange={handleScore} />

      {/* Botones de decisión */}
      <div className="flex gap-3 pt-2 pb-6">
        <button
          onClick={() => onGo(propuesta.id)}
          disabled={loading}
          className="flex-1 py-2.5 text-sm font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-40 transition-colors"
        >
          Go — Pasar a Diseño
        </button>
        <button
          onClick={() => onNoGo(propuesta.id)}
          disabled={loading}
          className="flex-1 py-2.5 text-sm font-semibold text-white bg-red-500 rounded-lg hover:bg-red-600 disabled:opacity-40 transition-colors"
        >
          No-Go — Archivar
        </button>
      </div>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────
export default function GoNoGo() {
  const [propuestas, setPropuestas]     = useState([])
  const [seleccionada, setSeleccionada] = useState(null)
  const [loading, setLoading]           = useState(false)
  const [fetching, setFetching]         = useState(true)

  const cargar = async () => {
    setFetching(true)
    const { data } = await supabase
      .from('propuestas')
      .select('*')
      .eq('estado', 'En Evaluación')
      .order('created_at', { ascending: false })
    setPropuestas(data ?? [])
    setFetching(false)
  }

  useEffect(() => { cargar() }, [])

  const cambiarEstado = async (id, nuevoEstado) => {
    setLoading(true)
    await supabase.from('propuestas').update({ estado: nuevoEstado }).eq('id', id)
    setSeleccionada(null)
    await cargar()
    setLoading(false)
  }

  if (fetching) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
        </svg>
        Cargando propuestas...
      </div>
    )
  }

  return (
    <div className="flex gap-5 h-full min-h-0" style={{ height: 'calc(100vh - 100px)' }}>

      {/* Lista izquierda */}
      <div className="w-72 flex-shrink-0 flex flex-col gap-2 overflow-y-auto">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
          En Evaluación ({propuestas.length})
        </p>

        {propuestas.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-200 bg-white p-6 text-center">
            <p className="text-sm text-gray-400">No hay propuestas en evaluación.</p>
            <p className="text-xs text-gray-300 mt-1">Ingresa una desde el Radar.</p>
          </div>
        )}

        {propuestas.map(p => (
          <button
            key={p.id}
            onClick={() => setSeleccionada(p)}
            className={`text-left w-full rounded-xl border p-4 transition-all ${
              seleccionada?.id === p.id
                ? 'border-blue-300 bg-blue-50 ring-2 ring-blue-200'
                : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
            }`}
          >
            <p className="text-sm font-medium text-gray-800 leading-snug line-clamp-2">{p.titulo}</p>
            <p className="text-xs text-gray-500 mt-1">{p.donante ?? '—'}</p>
            <p className="text-xs font-semibold text-blue-600 mt-2">{formatMoney(p.presupuesto_total)}</p>
          </button>
        ))}
      </div>

      {/* Panel derecho */}
      {seleccionada ? (
        <DetallePropuesta
          propuesta={seleccionada}
          onGo={(id) => cambiarEstado(id, 'En Diseño')}
          onNoGo={(id) => cambiarEstado(id, 'Archivada')}
          loading={loading}
        />
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <svg className="mx-auto mb-3 text-gray-300" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
            </svg>
            <p className="text-sm text-gray-400">Selecciona una propuesta para evaluarla</p>
          </div>
        </div>
      )}
    </div>
  )
}
