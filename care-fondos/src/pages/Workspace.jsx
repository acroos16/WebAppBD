import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

// ─── Helpers ──────────────────────────────────────────────
function formatMoney(n) {
  if (!n) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

const COLUMNAS = ['Pendiente', 'En Proceso', 'Completado']

const COLUMNA_STYLE = {
  'Pendiente':   { bg: 'bg-gray-50',   header: 'text-gray-500',   dot: 'bg-gray-300' },
  'En Proceso':  { bg: 'bg-blue-50',   header: 'text-blue-600',   dot: 'bg-blue-400' },
  'Completado':  { bg: 'bg-green-50',  header: 'text-green-600',  dot: 'bg-green-400' },
}

// ─── Tarjeta de tarea ─────────────────────────────────────
function TareaCard({ tarea, onCambiarEstado, onEliminar }) {
  const siguientes = COLUMNAS.filter(c => c !== tarea.estado)
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3 space-y-2 group">
      <p className="text-sm text-gray-800 leading-snug">{tarea.titulo}</p>
      {tarea.responsable && (
        <p className="text-xs text-gray-400">{tarea.responsable}</p>
      )}
      <div className="flex items-center justify-between pt-1">
        <div className="flex gap-1">
          {siguientes.map(sig => (
            <button
              key={sig}
              onClick={() => onCambiarEstado(tarea.id, sig)}
              className="text-xs px-2 py-0.5 rounded-md bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
            >
              → {sig}
            </button>
          ))}
        </div>
        <button
          onClick={() => onEliminar(tarea.id)}
          className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    </div>
  )
}

// ─── Kanban ───────────────────────────────────────────────
function Kanban({ propuestaId }) {
  const [tareas, setTareas]           = useState([])
  const [nuevaTarea, setNuevaTarea]   = useState('')
  const [responsable, setResponsable] = useState('')
  const [añadiendo, setAñadiendo]     = useState(false)

  const cargar = async () => {
    const { data } = await supabase
      .from('tareas')
      .select('*')
      .eq('propuesta_id', propuestaId)
      .order('created_at', { ascending: true })
    setTareas(data ?? [])
  }

  useEffect(() => { cargar() }, [propuestaId])

  const agregarTarea = async () => {
    if (!nuevaTarea.trim()) return
    await supabase.from('tareas').insert([{
      propuesta_id: propuestaId,
      titulo: nuevaTarea.trim(),
      responsable: responsable.trim() || null,
      estado: 'Pendiente',
    }])
    setNuevaTarea('')
    setResponsable('')
    setAñadiendo(false)
    cargar()
  }

  const cambiarEstado = async (id, nuevoEstado) => {
    await supabase.from('tareas').update({ estado: nuevoEstado }).eq('id', id)
    cargar()
  }

  const eliminar = async (id) => {
    await supabase.from('tareas').delete().eq('id', id)
    cargar()
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Tareas</p>
        <button
          onClick={() => setAñadiendo(true)}
          className="text-xs text-blue-600 hover:text-blue-700 font-medium"
        >
          + Nueva tarea
        </button>
      </div>

      {añadiendo && (
        <div className="bg-white rounded-xl border border-blue-200 p-3 space-y-2">
          <input
            autoFocus
            type="text"
            value={nuevaTarea}
            onChange={e => setNuevaTarea(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && agregarTarea()}
            placeholder="Título de la tarea"
            className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            value={responsable}
            onChange={e => setResponsable(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && agregarTarea()}
            placeholder="Responsable (opcional)"
            className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex gap-2">
            <button onClick={agregarTarea} className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
              Agregar
            </button>
            <button onClick={() => setAñadiendo(false)} className="px-3 py-1.5 text-xs font-medium text-gray-500 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        {COLUMNAS.map(col => {
          const { bg, header, dot } = COLUMNA_STYLE[col]
          const tareasDeLaColumna = tareas.filter(t => t.estado === col)
          return (
            <div key={col} className={`${bg} rounded-xl p-3 space-y-2 min-h-24`}>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${dot}`} />
                <p className={`text-xs font-semibold ${header}`}>{col}</p>
                <span className="ml-auto text-xs text-gray-400">{tareasDeLaColumna.length}</span>
              </div>
              {tareasDeLaColumna.map(t => (
                <TareaCard key={t.id} tarea={t} onCambiarEstado={cambiarEstado} onEliminar={eliminar} />
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Adjuntos ─────────────────────────────────────────────
function Adjuntos({ propuestaId }) {
  const [adjuntos, setAdjuntos]   = useState([])
  const [nombre, setNombre]       = useState('')
  const [url, setUrl]             = useState('')
  const [tipo, setTipo]           = useState('Drive')

  const TIPOS = ['Drive', 'TdR', 'Presupuesto', 'Narrativa', 'PDF Final', 'Otro']

  const cargar = async () => {
    const { data } = await supabase
      .from('adjuntos')
      .select('*')
      .eq('propuesta_id', propuestaId)
      .order('created_at', { ascending: true })
    setAdjuntos(data ?? [])
  }

  useEffect(() => { cargar() }, [propuestaId])

  const agregar = async () => {
    if (!nombre.trim() || !url.trim()) return
    try { new URL(url) } catch { return }
    await supabase.from('adjuntos').insert([{
      propuesta_id: propuestaId,
      nombre: nombre.trim(),
      url: url.trim(),
      tipo,
    }])
    setNombre('')
    setUrl('')
    cargar()
  }

  const eliminar = async (id) => {
    await supabase.from('adjuntos').delete().eq('id', id)
    cargar()
  }

  const TIPO_ICON = { 'Drive': '📁', 'TdR': '📄', 'Presupuesto': '📊', 'Narrativa': '📝', 'PDF Final': '📋', 'Otro': '🔗' }

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Adjuntos y enlaces</p>

      {/* Formulario */}
      <div className="bg-white rounded-xl border border-gray-200 p-3 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <input
            type="text"
            value={nombre}
            onChange={e => setNombre(e.target.value)}
            placeholder="Nombre del enlace"
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={tipo}
            onChange={e => setTipo(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            {TIPOS.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div className="flex gap-2">
          <input
            type="url"
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && agregar()}
            placeholder="https://..."
            className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button onClick={agregar} className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex-shrink-0">
            Agregar
          </button>
        </div>
      </div>

      {/* Lista */}
      {adjuntos.length > 0 && (
        <div className="space-y-1">
          {adjuntos.map(a => (
            <div key={a.id} className="flex items-center gap-2 bg-white rounded-lg border border-gray-100 px-3 py-2 group">
              <span className="text-sm">{TIPO_ICON[a.tipo] ?? '🔗'}</span>
              <a href={a.url} target="_blank" rel="noreferrer"
                className="flex-1 text-sm text-blue-600 hover:underline truncate">{a.nombre}</a>
              <span className="text-xs text-gray-400 flex-shrink-0">{a.tipo}</span>
              <button
                onClick={() => eliminar(a.id)}
                className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all flex-shrink-0"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Panel derecho de propuesta ───────────────────────────
function DetallePropuesta({ propuesta, onEnviar, onVolver, loading }) {
  return (
    <div className="flex-1 min-w-0 overflow-y-auto space-y-5 pb-8">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-purple-600 font-semibold uppercase tracking-wide mb-1">En Diseño</p>
            <h2 className="text-base font-semibold text-gray-900">{propuesta.titulo}</h2>
            <p className="text-sm text-gray-500 mt-0.5">{propuesta.donante} · {formatMoney(propuesta.presupuesto_total)}</p>
          </div>
          <button
            onClick={() => onEnviar(propuesta.id)}
            disabled={loading}
            className="flex-shrink-0 px-4 py-2 text-sm font-semibold text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-40 transition-colors"
          >
            {loading ? 'Enviando...' : 'Enviar al donante'}
          </button>
        </div>
      </div>

      {/* Kanban */}
      <Kanban propuestaId={propuesta.id} />

      {/* Adjuntos */}
      <Adjuntos propuestaId={propuesta.id} />
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────
export default function Workspace() {
  const [propuestas, setPropuestas]     = useState([])
  const [seleccionada, setSeleccionada] = useState(null)
  const [loading, setLoading]           = useState(false)
  const [fetching, setFetching]         = useState(true)

  const cargar = async () => {
    setFetching(true)
    const { data } = await supabase
      .from('propuestas')
      .select('*')
      .eq('estado', 'En Diseño')
      .order('created_at', { ascending: false })
    setPropuestas(data ?? [])
    setFetching(false)
  }

  useEffect(() => { cargar() }, [])

  const enviarAlDonante = async (id) => {
    setLoading(true)
    await supabase.from('propuestas').update({ estado: 'Presentada' }).eq('id', id)
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
    <div className="flex gap-5" style={{ height: 'calc(100vh - 100px)' }}>

      {/* Lista izquierda */}
      <div className="w-72 flex-shrink-0 flex flex-col gap-2 overflow-y-auto">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
          En Diseño ({propuestas.length})
        </p>

        {propuestas.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-200 bg-white p-6 text-center">
            <p className="text-sm text-gray-400">No hay propuestas en diseño.</p>
            <p className="text-xs text-gray-300 mt-1">Aprueba una desde Go/No-Go.</p>
          </div>
        )}

        {propuestas.map(p => (
          <button
            key={p.id}
            onClick={() => setSeleccionada(p)}
            className={`text-left w-full rounded-xl border p-4 transition-all ${
              seleccionada?.id === p.id
                ? 'border-purple-300 bg-purple-50 ring-2 ring-purple-200'
                : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
            }`}
          >
            <p className="text-sm font-medium text-gray-800 leading-snug line-clamp-2">{p.titulo}</p>
            <p className="text-xs text-gray-500 mt-1">{p.donante ?? '—'}</p>
            <p className="text-xs font-semibold text-purple-600 mt-2">{formatMoney(p.presupuesto_total)}</p>
          </button>
        ))}
      </div>

      {/* Panel derecho */}
      {seleccionada ? (
        <DetallePropuesta
          propuesta={seleccionada}
          onEnviar={enviarAlDonante}
          onVolver={() => setSeleccionada(null)}
          loading={loading}
        />
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <svg className="mx-auto mb-3 text-gray-300" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
            </svg>
            <p className="text-sm text-gray-400">Selecciona una propuesta para trabajarla</p>
          </div>
        </div>
      )}
    </div>
  )
}
