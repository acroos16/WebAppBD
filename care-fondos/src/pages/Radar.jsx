import { useState, useRef } from 'react'
import { extractFromFile, extractFromUrl, ACCEPTED_EXTENSIONS, getFileIcon } from '../lib/extractText'
import { analizarConvocatoria } from '../lib/ollama'
import { supabase } from '../lib/supabase'

const STATES = { IDLE: 'idle', EXTRACTING: 'extracting', ANALYZING: 'analyzing', REVIEW: 'review', SAVING: 'saving', DONE: 'done' }

const emptyForm = {
  titulo: '', donante: '', link_carpeta: '',
  prioridades_tematicas: '', gerencia: '',
  prioridades_geograficas: '', prioridades_demograficas: '',
  duracion_meses: '', presupuesto_total: '', icr_permitido: '',
  modalidad_desembolso: 'Subvención', requiere_match: false, requiere_socio: false,
  fases_propuesta: '',
  deadline_preguntas: '', deadline_envio: '',
  fecha_probable_respuesta: '', fecha_probable_inicio: '', fecha_probable_fin: '',
  contexto: '', objetivo_general: '', objetivos_especificos: '', puntos_clave: '',
}

// ── Componentes pequeños ──────────────────────────────────
function Toggle({ value, onChange, label }) {
  return (
    <div className="flex items-center gap-3">
      <button type="button" onClick={() => onChange(!value)}
        className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${value ? 'bg-blue-600' : 'bg-gray-200'}`}>
        <span className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transition duration-200 ${value ? 'translate-x-4' : 'translate-x-0'}`} />
      </button>
      <span className="text-sm text-gray-700">{label}</span>
    </div>
  )
}

function Label({ children }) {
  return <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{children}</label>
}

function Input({ value, onChange, placeholder, type = 'text', ...props }) {
  return (
    <input type={type} value={value ?? ''} onChange={onChange} placeholder={placeholder}
      className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow" {...props} />
  )
}

function Textarea({ value, onChange, placeholder, rows = 3 }) {
  return (
    <textarea value={value ?? ''} onChange={onChange} placeholder={placeholder} rows={rows}
      className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-shadow" />
  )
}

function SectionCard({ title, children }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">{title}</p>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  )
}

function Grid2({ children }) {
  return <div className="grid grid-cols-2 gap-4">{children}</div>
}

// ── Pantalla de carga ─────────────────────────────────────
function LoadingScreen({ state, progress }) {
  return (
    <div className="max-w-lg">
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-10 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mx-auto">
          <svg className="animate-spin" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-800">
            {state === 'extracting' ? 'Extrayendo contenido...' : 'Analizando con IA (llama3.2)...'}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {state === 'extracting' ? progress : 'Esto puede tomar 30–90 segundos según el volumen del documento.'}
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Formulario de revisión ────────────────────────────────
function ReviewForm({ form, setForm, onGuardar, onCancelar, saving, error }) {
  const f = (key) => (e) => setForm(prev => ({ ...prev, [key]: e.target.value }))
  const b = (key) => (val) => setForm(prev => ({ ...prev, [key]: val }))

  return (
    <div className="max-w-3xl space-y-5 pb-10">
      <div className="flex items-center gap-2 text-sm text-gray-500 bg-blue-50 border border-blue-100 rounded-lg px-4 py-2.5">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <span className="text-blue-700 text-xs">Revisa y corrige los datos extraídos por la IA antes de guardar. Los campos en blanco no fueron encontrados en el documento.</span>
      </div>

      {/* 1. Info General */}
      <SectionCard title="Información General">
        <div>
          <Label>Título de la convocatoria *</Label>
          <Input value={form.titulo} onChange={f('titulo')} placeholder="Nombre oficial de la convocatoria" />
        </div>
        <Grid2>
          <div>
            <Label>Donante</Label>
            <Input value={form.donante} onChange={f('donante')} placeholder="USAID, ECHO, AECID..." />
          </div>
          <div>
            <Label>Gerencia responsable</Label>
            <Input value={form.gerencia} onChange={f('gerencia')} placeholder="Gerencia de Programas..." />
          </div>
        </Grid2>
        <div>
          <Label>Link de la carpeta</Label>
          <Input value={form.link_carpeta} onChange={f('link_carpeta')} placeholder="https://drive.google.com/..." type="url" />
        </div>
      </SectionCard>

      {/* 2. Prioridades */}
      <SectionCard title="Prioridades">
        <div>
          <Label>Prioridades temáticas</Label>
          <Textarea value={form.prioridades_tematicas} onChange={f('prioridades_tematicas')} placeholder="Áreas y sectores de intervención que financia el donante..." />
        </div>
        <Grid2>
          <div>
            <Label>Prioridades geográficas</Label>
            <Textarea value={form.prioridades_geograficas} onChange={f('prioridades_geograficas')} placeholder="Regiones, provincias, distritos..." rows={2} />
          </div>
          <div>
            <Label>Prioridades demográficas</Label>
            <Textarea value={form.prioridades_demograficas} onChange={f('prioridades_demograficas')} placeholder="Población objetivo: mujeres, niños, indígenas..." rows={2} />
          </div>
        </Grid2>
      </SectionCard>

      {/* 3. Aspectos Financieros */}
      <SectionCard title="Aspectos Financieros">
        <Grid2>
          <div>
            <Label>Presupuesto total (USD)</Label>
            <Input value={form.presupuesto_total} onChange={f('presupuesto_total')} placeholder="500000" type="number" />
          </div>
          <div>
            <Label>ICR permitido (%)</Label>
            <Input value={form.icr_permitido} onChange={f('icr_permitido')} placeholder="10" type="number" />
          </div>
        </Grid2>
        <Grid2>
          <div>
            <Label>Duración (meses)</Label>
            <Input value={form.duracion_meses} onChange={f('duracion_meses')} placeholder="24" type="number" />
          </div>
          <div>
            <Label>Fase(s) de la propuesta</Label>
            <select value={form.fases_propuesta} onChange={f('fases_propuesta')}
              className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Seleccionar</option>
              <option value="1">1 etapa</option>
              <option value="2">2 etapas</option>
              <option value="3">3 etapas</option>
            </select>
          </div>
        </Grid2>
        <div>
          <Label>Modalidad de desembolso</Label>
          <div className="flex gap-2">
            {['Subvención', 'Servicio'].map(op => (
              <button key={op} type="button" onClick={() => setForm(p => ({ ...p, modalidad_desembolso: op }))}
                className={`px-4 py-2 text-sm rounded-lg border transition-colors font-medium ${form.modalidad_desembolso === op ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}>
                {op}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-8">
          <Toggle value={form.requiere_match} onChange={b('requiere_match')} label="Requiere contrapartida (match)" />
          <Toggle value={form.requiere_socio} onChange={b('requiere_socio')} label="Requiere socio implementador" />
        </div>
      </SectionCard>

      {/* 4. Fechas Clave */}
      <SectionCard title="Fechas Clave">
        <Grid2>
          <div>
            <Label>Deadline for Questions</Label>
            <Input value={form.deadline_preguntas} onChange={f('deadline_preguntas')} type="date" />
          </div>
          <div>
            <Label>Deadline for Submission</Label>
            <Input value={form.deadline_envio} onChange={f('deadline_envio')} type="date" />
          </div>
        </Grid2>
        <Grid2>
          <div>
            <Label>Fecha probable de respuesta</Label>
            <Input value={form.fecha_probable_respuesta} onChange={f('fecha_probable_respuesta')} type="date" />
          </div>
          <div>
            <Label>Fecha probable de inicio</Label>
            <Input value={form.fecha_probable_inicio} onChange={f('fecha_probable_inicio')} type="date" />
          </div>
        </Grid2>
        <div className="max-w-sm">
          <Label>Fecha probable de fin</Label>
          <Input value={form.fecha_probable_fin} onChange={f('fecha_probable_fin')} type="date" />
        </div>
      </SectionCard>

      {/* 5. Contexto y Objetivos */}
      <SectionCard title="Contexto y Objetivos">
        <div>
          <Label>Contexto</Label>
          <Textarea value={form.contexto} onChange={f('contexto')} placeholder="Antecedentes y justificación de la convocatoria..." rows={4} />
        </div>
        <div>
          <Label>Objetivo General</Label>
          <Textarea value={form.objetivo_general} onChange={f('objetivo_general')} placeholder="Objetivo principal de la convocatoria..." rows={3} />
        </div>
        <div>
          <Label>Objetivos Específicos</Label>
          <Textarea value={form.objetivos_especificos} onChange={f('objetivos_especificos')} placeholder={"OE1: ...\nOE2: ...\nOE3: ..."} rows={4} />
        </div>
        <div>
          <Label>Puntos clave de la convocatoria</Label>
          <Textarea value={form.puntos_clave} onChange={f('puntos_clave')} placeholder="Elegibilidad, restricciones y requisitos críticos..." rows={4} />
        </div>
      </SectionCard>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="flex gap-3 pt-1">
        <button onClick={onGuardar} disabled={!form.titulo || saving}
          className="px-6 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm">
          {saving ? 'Guardando...' : 'Guardar y enviar a Go/No-Go'}
        </button>
        <button onClick={onCancelar}
          className="px-6 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
          Cancelar
        </button>
      </div>
    </div>
  )
}

// ── Componente principal ──────────────────────────────────
export default function Radar() {
  const [flowState, setFlowState] = useState(STATES.IDLE)
  const [files, setFiles]         = useState([])
  const [urls, setUrls]           = useState([])
  const [urlInput, setUrlInput]   = useState('')
  const [dragging, setDragging]   = useState(false)
  const [progress, setProgress]   = useState('')
  const [form, setForm]           = useState(emptyForm)
  const [error, setError]         = useState(null)
  const fileInputRef              = useRef(null)

  const hasContent = files.length > 0 || urls.length > 0

  const VALID_EXTS = ['.pdf', '.docx', '.xlsx', '.xls', '.pptx']
  const isValidFile = (f) => VALID_EXTS.some(ext => f.name.toLowerCase().endsWith(ext))

  const addFiles = (newFiles) => {
    const valid = Array.from(newFiles).filter(isValidFile)
    setFiles(prev => { const names = new Set(prev.map(f => f.name)); return [...prev, ...valid.filter(f => !names.has(f.name))] })
  }
  const removeFile = (name) => setFiles(prev => prev.filter(f => f.name !== name))

  const addUrl = () => {
    const trimmed = urlInput.trim()
    if (!trimmed || urls.includes(trimmed)) return
    try { new URL(trimmed) } catch { setError('URL inválida'); return }
    setUrls(prev => [...prev, trimmed]); setUrlInput(''); setError(null)
  }
  const removeUrl = (url) => setUrls(prev => prev.filter(u => u !== url))

  const handleProcesar = async () => {
    setError(null)
    try {
      setFlowState(STATES.EXTRACTING)
      const textos = []
      for (const file of files) { setProgress(`Leyendo ${file.name}...`); textos.push(await extractFromFile(file)) }
      for (const url of urls)   { setProgress(`Leyendo ${url}...`);       textos.push(await extractFromUrl(url)) }
      setFlowState(STATES.ANALYZING)
      const r = await analizarConvocatoria(textos.join('\n\n---\n\n'))
      setForm({
        titulo: r.titulo ?? '', donante: r.donante ?? '', link_carpeta: r.link_carpeta ?? '',
        prioridades_tematicas: r.prioridades_tematicas ?? '', gerencia: r.gerencia ?? '',
        prioridades_geograficas: r.prioridades_geograficas ?? '', prioridades_demograficas: r.prioridades_demograficas ?? '',
        duracion_meses: r.duracion_meses ?? '', presupuesto_total: r.presupuesto_total ?? '',
        icr_permitido: r.icr_permitido ?? '', modalidad_desembolso: r.modalidad_desembolso ?? 'Subvención',
        requiere_match: r.requiere_match ?? false, requiere_socio: r.requiere_socio ?? false,
        fases_propuesta: r.fases_propuesta ?? '',
        deadline_preguntas: r.deadline_preguntas ?? '', deadline_envio: r.deadline_envio ?? '',
        fecha_probable_respuesta: r.fecha_probable_respuesta ?? '', fecha_probable_inicio: r.fecha_probable_inicio ?? '',
        fecha_probable_fin: r.fecha_probable_fin ?? '',
        contexto: r.contexto ?? '', objetivo_general: r.objetivo_general ?? '',
        objetivos_especificos: r.objetivos_especificos ?? '', puntos_clave: r.puntos_clave ?? '',
      })
      setFlowState(STATES.REVIEW)
    } catch (err) { setError(err.message); setFlowState(STATES.IDLE) }
  }

  const handleGuardar = async () => {
    setFlowState(STATES.SAVING)
    const { error: sbError } = await supabase.from('propuestas').insert([{
      titulo: form.titulo, donante: form.donante, link_carpeta: form.link_carpeta || null,
      prioridades_tematicas: form.prioridades_tematicas || null,
      prioridades_estrategicas: form.prioridades_tematicas || null,
      gerencia: form.gerencia || null,
      prioridades_geograficas: form.prioridades_geograficas || null,
      prioridades_demograficas: form.prioridades_demograficas || null,
      duracion_meses: parseInt(form.duracion_meses) || null,
      presupuesto_total: parseFloat(form.presupuesto_total) || null,
      icr_permitido: parseFloat(form.icr_permitido) || null,
      modalidad_desembolso: form.modalidad_desembolso || null,
      requiere_match: form.requiere_match, requiere_socio: form.requiere_socio,
      fases_propuesta: form.fases_propuesta || null,
      deadline_preguntas: form.deadline_preguntas || null,
      deadline_envio: form.deadline_envio || null,
      fecha_probable_respuesta: form.fecha_probable_respuesta || null,
      fecha_probable_inicio: form.fecha_probable_inicio || null,
      fecha_probable_fin: form.fecha_probable_fin || null,
      contexto: form.contexto || null,
      objetivo_general: form.objetivo_general || null,
      objetivos_especificos: form.objetivos_especificos || null,
      puntos_clave: form.puntos_clave || null,
      estado: 'En Evaluación',
    }])
    if (sbError) { setError('Error Supabase: ' + sbError.message); setFlowState(STATES.REVIEW) }
    else setFlowState(STATES.DONE)
  }

  const handleReset = () => { setFlowState(STATES.IDLE); setFiles([]); setUrls([]); setUrlInput(''); setForm(emptyForm); setError(null) }

  // ── Renders condicionales ─────────────────────────────────
  if (flowState === STATES.DONE) {
    return (
      <div className="max-w-lg">
        <div className="rounded-xl border border-green-200 bg-green-50 p-10 text-center shadow-sm">
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <p className="text-base font-semibold text-green-800">Propuesta guardada</p>
          <p className="text-sm text-green-600 mt-1"><strong>{form.titulo}</strong> está en Go/No-Go.</p>
          <button onClick={handleReset} className="mt-6 px-5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors shadow-sm">
            Ingresar otra convocatoria
          </button>
        </div>
      </div>
    )
  }

  if (flowState === STATES.EXTRACTING || flowState === STATES.ANALYZING) {
    return <LoadingScreen state={flowState} progress={progress} />
  }

  if (flowState === STATES.REVIEW || flowState === STATES.SAVING) {
    return <ReviewForm form={form} setForm={setForm} onGuardar={handleGuardar}
      onCancelar={handleReset} saving={flowState === STATES.SAVING} error={error} />
  }

  // ── IDLE ──────────────────────────────────────────────────
  const totalFuentes = files.length + urls.length
  return (
    <div className="max-w-2xl space-y-4">

      {/* URLs */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Páginas web de la convocatoria</p>
        <div className="flex gap-2">
          <input type="url" value={urlInput} onChange={e => setUrlInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addUrl()}
            placeholder="https://donante.org/convocatoria-2026"
            className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
          <button onClick={addUrl} className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
            Agregar
          </button>
        </div>
        {urls.length > 0 && (
          <ul className="space-y-1">
            {urls.map(url => (
              <li key={url} className="flex items-center justify-between gap-2 text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
                <span className="truncate">{url}</span>
                <button onClick={() => removeUrl(url)} className="text-gray-400 hover:text-red-500 flex-shrink-0 transition-colors">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Dropzone */}
      <div onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files) }}
        onClick={() => fileInputRef.current?.click()}
        className={`cursor-pointer rounded-xl border-2 border-dashed p-10 text-center transition-all ${dragging ? 'border-blue-400 bg-blue-50 scale-[1.01]' : 'border-gray-300 bg-white hover:border-blue-300 hover:bg-blue-50/30'}`}>
        <input ref={fileInputRef} type="file" accept={ACCEPTED_EXTENSIONS} multiple className="hidden" onChange={e => { addFiles(e.target.files); e.target.value = '' }} />
        <svg className="mx-auto mb-3 text-gray-300" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
        <p className="text-sm font-medium text-gray-600">Arrastra documentos aquí o haz clic</p>
        <p className="text-xs text-gray-400 mt-1">PDF · Word (.docx) · Excel (.xlsx) · PowerPoint (.pptx)</p>
      </div>

      {/* Archivos */}
      {files.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Documentos ({files.length})</p>
          {files.map(f => {
            const { icon } = getFileIcon(f.name)
            return (
              <div key={f.name} className="flex items-center justify-between gap-2 text-sm text-gray-700">
                <div className="flex items-center gap-2 min-w-0">
                  <span>{icon}</span>
                  <span className="truncate">{f.name}</span>
                  <span className="text-gray-400 text-xs flex-shrink-0">({(f.size / 1024).toFixed(0)} KB)</span>
                </div>
                <button onClick={() => removeFile(f.name)} className="text-gray-300 hover:text-red-400 flex-shrink-0 transition-colors">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            )
          })}
        </div>
      )}

      {error && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700"><strong>Error:</strong> {error}</div>}

      <button onClick={handleProcesar} disabled={!hasContent}
        className="px-6 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm flex items-center gap-2">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="2"/><path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14"/>
        </svg>
        Analizar con IA {totalFuentes > 0 && `(${totalFuentes} ${totalFuentes === 1 ? 'fuente' : 'fuentes'})`}
      </button>
    </div>
  )
}
