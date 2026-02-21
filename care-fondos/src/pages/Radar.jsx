import { useState, useRef } from 'react'
import { extractFromFile, extractFromUrl, ACCEPTED_EXTENSIONS, getFileIcon } from '../lib/extractText'
import { analizarConvocatoria } from '../lib/ollama'
import { supabase } from '../lib/supabase'

// ─── Estados del flujo ────────────────────────────────────────────────────────
const IDLE       = 'IDLE'
const EXTRACTING = 'EXTRACTING'
const ANALYZING  = 'ANALYZING'
const REVIEW     = 'REVIEW'
const SAVING     = 'SAVING'
const DONE       = 'DONE'

// ─── Formulario vacío (22 campos) ────────────────────────────────────────────
const emptyForm = {
  titulo: '',
  donante: '',
  prioridades_tematicas: '',
  gerencia: '',
  prioridades_geograficas: '',
  prioridades_demograficas: '',
  duracion_meses: '',
  presupuesto_total: '',
  icr_permitido: '',
  modalidad_desembolso: '',
  requiere_match: '',
  requiere_socio: '',
  fases_propuesta: '',
  deadline_preguntas: '',
  deadline_envio: '',
  fecha_probable_respuesta: '',
  fecha_probable_inicio: '',
  fecha_probable_fin: '',
  contexto: '',
  objetivo_general: '',
  objetivos_especificos: '',
  puntos_clave: '',
}

// ─── Componente de sección ────────────────────────────────────────────────────
function SectionCard({ title, children }) {
  return (
    <div className="border border-[#d0d7de] rounded-md overflow-hidden mb-4">
      <div className="bg-[#f6f8fa] border-b border-[#d0d7de] px-4 py-2.5">
        <h3 className="text-sm font-semibold text-[#24292f]">{title}</h3>
      </div>
      <div className="p-4 bg-white grid grid-cols-1 md:grid-cols-2 gap-4">
        {children}
      </div>
    </div>
  )
}

// ─── Campo de formulario ──────────────────────────────────────────────────────
function Field({ label, children, full }) {
  return (
    <div className={full ? 'md:col-span-2' : ''}>
      <label className="block text-xs font-semibold text-[#57606a] mb-1">{label}</label>
      {children}
    </div>
  )
}

const inputCls = 'w-full text-sm border border-[#d0d7de] rounded-md px-3 py-1.5 text-[#24292f] bg-white focus:outline-none focus:border-[#0969da] focus:ring-2 focus:ring-[#0969da]/20'

// ─── Componente principal ─────────────────────────────────────────────────────
export default function Radar() {
  const [step, setStep]       = useState(IDLE)
  const [form, setForm]       = useState(emptyForm)
  const [error, setError]     = useState(null)
  const [files, setFiles]     = useState([])       // archivos seleccionados
  const [urlInput, setUrlInput] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [, setSavedId] = useState(null)
  const [debug, setDebug] = useState(null)   // { textLen, rawAI }
  const fileInputRef = useRef(null)

  // ── Actualizar campo del formulario ──────────────────────────────────────────
  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }))

  // ── Manejo de archivos ────────────────────────────────────────────────────────
  function onDrop(e) {
    e.preventDefault()
    setIsDragging(false)
    const dropped = Array.from(e.dataTransfer.files)
    setFiles(prev => [...prev, ...dropped])
  }

  function onFileInput(e) {
    const selected = Array.from(e.target.files)
    setFiles(prev => [...prev, ...selected])
    e.target.value = ''
  }

  function removeFile(idx) {
    setFiles(prev => prev.filter((_, i) => i !== idx))
  }

  // ── Iniciar análisis ──────────────────────────────────────────────────────────
  async function handleAnalyze() {
    if (files.length === 0 && !urlInput.trim()) {
      setError('Agrega al menos un documento o una URL antes de analizar.')
      return
    }
    setError(null)

    try {
      // 1. Extraer texto
      setStep(EXTRACTING)
      const textos = []

      for (const file of files) {
        const txt = await extractFromFile(file)
        textos.push(txt)
      }

      if (urlInput.trim()) {
        const txt = await extractFromUrl(urlInput.trim())
        textos.push(txt)
      }

      const textoTotal = textos.join('\n\n---\n\n')

      if (!textoTotal.trim()) {
        throw new Error('No se pudo extraer texto del documento. Verifica que el archivo no esté protegido o vacío.')
      }

      // 2. Analizar con IA
      setStep(ANALYZING)
      const resultado = await analizarConvocatoria(textoTotal)

      // Guardar info de diagnóstico
      const camposRellenos = Object.values(resultado).filter(v => v !== null && v !== undefined && v !== '').length
      setDebug({ textLen: textoTotal.length, camposRellenos, total: Object.keys(resultado).length })

      // 3. Llenar formulario
      setForm(prev => {
        const next = { ...prev }
        Object.entries(resultado).forEach(([k, v]) => {
          if (v !== null && v !== undefined && k in next) {
            next[k] = String(v)
          }
        })
        return next
      })

      setStep(REVIEW)
    } catch (err) {
      setError(err.message)
      setStep(IDLE)
    }
  }

  // ── Guardar en Supabase ───────────────────────────────────────────────────────
  async function handleSave() {
    setStep(SAVING)
    setError(null)
    try {
      const payload = {
        titulo:                  form.titulo                  || null,
        donante:                 form.donante                 || null,
        prioridades_tematicas:   form.prioridades_tematicas   || null,
        gerencia:                form.gerencia                || null,
        prioridades_geograficas: form.prioridades_geograficas || null,
        prioridades_demograficas:form.prioridades_demograficas|| null,
        duracion_meses:          form.duracion_meses          ? Number(form.duracion_meses)     : null,
        presupuesto_total:       form.presupuesto_total       ? Number(form.presupuesto_total)  : null,
        icr_permitido:           form.icr_permitido           ? Number(form.icr_permitido)      : null,
        modalidad_desembolso:    form.modalidad_desembolso    || null,
        requiere_match:          form.requiere_match === 'true' ? true : form.requiere_match === 'false' ? false : null,
        requiere_socio:          form.requiere_socio === 'true' ? true : form.requiere_socio === 'false' ? false : null,
        fases_propuesta:         form.fases_propuesta         || null,
        deadline_preguntas:      form.deadline_preguntas      || null,
        deadline_envio:          form.deadline_envio          || null,
        fecha_probable_respuesta:form.fecha_probable_respuesta|| null,
        fecha_probable_inicio:   form.fecha_probable_inicio   || null,
        fecha_probable_fin:      form.fecha_probable_fin      || null,
        contexto:                form.contexto                || null,
        objetivo_general:        form.objetivo_general        || null,
        objetivos_especificos:   form.objetivos_especificos   || null,
        puntos_clave:            form.puntos_clave            || null,
        estado:                  'En Evaluación',
      }

      const { data, error: sbError } = await supabase
        .from('propuestas')
        .insert([payload])
        .select()

      if (sbError) throw sbError
      setSavedId(data[0]?.id)
      setStep(DONE)
    } catch (err) {
      setError(err.message)
      setStep(REVIEW)
    }
  }

  // ── Reset ─────────────────────────────────────────────────────────────────────
  function handleReset() {
    setStep(IDLE)
    setForm(emptyForm)
    setFiles([])
    setUrlInput('')
    setError(null)
    setSavedId(null)
  }

  // ── DONE ──────────────────────────────────────────────────────────────────────
  if (step === DONE) {
    return (
      <div className="p-8 flex flex-col items-center justify-center text-center min-h-[400px]">
        <div className="w-12 h-12 rounded-full bg-[#dafbe1] flex items-center justify-center mb-4">
          <svg className="text-[#1a7f37]" width="24" height="24" viewBox="0 0 16 16" fill="currentColor">
            <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z"/>
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-[#24292f] mb-1">Convocatoria guardada</h2>
        <p className="text-sm text-[#57606a] mb-6">
          La propuesta fue guardada con estado <strong>En Evaluación</strong>.
          Puedes evaluarla en el módulo Go / No-Go.
        </p>
        <button
          onClick={handleReset}
          className="bg-[#2da44e] text-white px-4 py-2 text-sm font-medium rounded-md border border-[rgba(27,31,36,0.15)] shadow-sm hover:bg-[#2c974b] transition-colors"
        >
          Analizar otra convocatoria
        </button>
      </div>
    )
  }

  // ── IDLE — pantalla de carga ──────────────────────────────────────────────────
  if (step === IDLE || step === EXTRACTING || step === ANALYZING) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <h2 className="text-base font-semibold text-[#24292f] mb-1">Nueva Convocatoria</h2>
        <p className="text-sm text-[#57606a] mb-5">
          Sube documentos y/o pega una URL. La IA extraerá los datos clave automáticamente.
        </p>

        {/* URL Input */}
        <div className="mb-4">
          <label className="block text-xs font-semibold text-[#57606a] mb-1.5">URL de la convocatoria</label>
          <div className="flex gap-2">
            <input
              type="url"
              placeholder="https://www.donante.org/convocatoria-2025"
              value={urlInput}
              onChange={e => setUrlInput(e.target.value)}
              className={inputCls + ' flex-1'}
              disabled={step !== IDLE}
            />
          </div>
        </div>

        {/* Dropzone */}
        <div
          onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-md px-6 py-10 text-center cursor-pointer transition-colors mb-4 ${
            isDragging
              ? 'border-[#0969da] bg-[#ddf4ff]'
              : 'border-[#d0d7de] bg-[#f6f8fa] hover:border-[#0969da] hover:bg-[#f0f6ff]'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ACCEPTED_EXTENSIONS}
            onChange={onFileInput}
            className="hidden"
          />
          <svg className="mx-auto mb-3 text-[#8c959f]" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          <p className="text-sm font-medium text-[#24292f]">Arrastra archivos aquí o haz clic para seleccionar</p>
          <p className="text-xs text-[#57606a] mt-1">PDF, Word (.docx), Excel (.xlsx), PowerPoint (.pptx)</p>
        </div>

        {/* Lista de archivos */}
        {files.length > 0 && (
          <div className="border border-[#d0d7de] rounded-md divide-y divide-[#d0d7de] mb-4 overflow-hidden">
            {files.map((file, idx) => {
              const { icon } = getFileIcon(file.name)
              return (
                <div key={idx} className="flex items-center gap-3 px-4 py-2.5 bg-white">
                  <span className="text-lg">{icon}</span>
                  <span className="flex-1 text-sm text-[#24292f] truncate">{file.name}</span>
                  <span className="text-xs text-[#57606a] mr-2">{(file.size / 1024).toFixed(0)} KB</span>
                  <button
                    onClick={e => { e.stopPropagation(); removeFile(idx) }}
                    className="text-[#57606a] hover:text-[#cf222e] transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z"/>
                    </svg>
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-4 flex items-start gap-2 bg-[#fff8c5] border border-[#d4a72c] text-[#7d4e00] rounded-md px-4 py-3 text-sm">
            <svg className="flex-shrink-0 mt-0.5" width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M6.457 1.047c.659-1.234 2.427-1.234 3.086 0l6.082 11.378A1.75 1.75 0 0114.082 15H1.918a1.75 1.75 0 01-1.543-2.575zm1.763.707a.25.25 0 00-.44 0L1.698 13.132a.25.25 0 00.22.368h12.164a.25.25 0 00.22-.368zM9 11a1 1 0 11-2 0 1 1 0 012 0zm-.25-5.25a.75.75 0 00-1.5 0v2.5a.75.75 0 001.5 0z"/>
            </svg>
            {error}
          </div>
        )}

        {/* Estado de procesamiento */}
        {(step === EXTRACTING || step === ANALYZING) && (
          <div className="flex items-center gap-3 text-sm text-[#57606a] mb-4 bg-[#f6f8fa] border border-[#d0d7de] rounded-md px-4 py-3">
            <svg className="animate-spin text-[#0969da]" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12a9 9 0 11-6.219-8.56"/>
            </svg>
            {step === EXTRACTING ? 'Extrayendo texto del documento…' : 'La IA está analizando la convocatoria…'}
          </div>
        )}

        {/* Botón */}
        <button
          onClick={handleAnalyze}
          disabled={step !== IDLE}
          className="w-full bg-[#2da44e] text-white py-2 text-sm font-medium rounded-md border border-[rgba(27,31,36,0.15)] shadow-sm hover:bg-[#2c974b] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {step === IDLE ? 'Analizar con IA' : 'Procesando…'}
        </button>
      </div>
    )
  }

  // ── REVIEW — formulario ───────────────────────────────────────────────────────
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-base font-semibold text-[#24292f]">Revisar datos extraídos</h2>
          <p className="text-xs text-[#57606a] mt-0.5">Verifica y corrige la información antes de guardar.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleReset}
            className="px-3 py-1.5 text-sm font-medium text-[#24292f] bg-white border border-[#d0d7de] rounded-md hover:bg-[#f3f4f6] transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={step === SAVING}
            className="px-4 py-1.5 text-sm font-medium text-white bg-[#2da44e] border border-[rgba(27,31,36,0.15)] rounded-md shadow-sm hover:bg-[#2c974b] disabled:opacity-50 transition-colors"
          >
            {step === SAVING ? 'Guardando…' : 'Guardar en Pipeline'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2 bg-[#fff8c5] border border-[#d4a72c] text-[#7d4e00] rounded-md px-4 py-3 text-sm">
          <svg className="flex-shrink-0 mt-0.5" width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path d="M6.457 1.047c.659-1.234 2.427-1.234 3.086 0l6.082 11.378A1.75 1.75 0 0114.082 15H1.918a1.75 1.75 0 01-1.543-2.575zm1.763.707a.25.25 0 00-.44 0L1.698 13.132a.25.25 0 00.22.368h12.164a.25.25 0 00.22-.368zM9 11a1 1 0 11-2 0 1 1 0 012 0zm-.25-5.25a.75.75 0 00-1.5 0v2.5a.75.75 0 001.5 0z"/>
          </svg>
          {error}
        </div>
      )}

      {/* ── Diagnóstico ── */}
      {debug && (
        <div className={`mb-4 flex items-center gap-3 px-4 py-2.5 rounded-md border text-sm ${
          debug.camposRellenos === 0
            ? 'bg-[#fff8c5] border-[#d4a72c] text-[#7d4e00]'
            : 'bg-[#dafbe1] border-[#4ac26b] text-[#1a7f37]'
        }`}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            {debug.camposRellenos === 0
              ? <path d="M6.457 1.047c.659-1.234 2.427-1.234 3.086 0l6.082 11.378A1.75 1.75 0 0114.082 15H1.918a1.75 1.75 0 01-1.543-2.575zm1.763.707a.25.25 0 00-.44 0L1.698 13.132a.25.25 0 00.22.368h12.164a.25.25 0 00.22-.368zM9 11a1 1 0 11-2 0 1 1 0 012 0zm-.25-5.25a.75.75 0 00-1.5 0v2.5a.75.75 0 001.5 0z"/>
              : <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z"/>
            }
          </svg>
          <span>
            Texto extraído: <strong>{debug.textLen.toLocaleString()} caracteres</strong> ·
            Campos detectados por IA: <strong>{debug.camposRellenos} / {debug.total}</strong>
            {debug.camposRellenos === 0 && ' — El modelo no detectó datos. ¿Está corriendo Ollama? ¿El documento tiene texto seleccionable?'}
          </span>
        </div>
      )}

      {/* ── 1. Información General ── */}
      <SectionCard title="Información General">
        <Field label="Título de la convocatoria" full>
          <input value={form.titulo} onChange={set('titulo')} className={inputCls} placeholder="Nombre oficial" />
        </Field>
        <Field label="Donante">
          <input value={form.donante} onChange={set('donante')} className={inputCls} placeholder="USAID, ECHO…" />
        </Field>
        <Field label="Gerencia CARE">
          <input value={form.gerencia} onChange={set('gerencia')} className={inputCls} placeholder="Gerencia interna" />
        </Field>
        <Field label="Modalidad">
          <select value={form.modalidad_desembolso} onChange={set('modalidad_desembolso')} className={inputCls}>
            <option value="">— Seleccionar —</option>
            <option value="Subvención">Subvención (Grant)</option>
            <option value="Servicio">Servicio (Contrato)</option>
          </select>
        </Field>
        <Field label="Fases de postulación">
          <select value={form.fases_propuesta} onChange={set('fases_propuesta')} className={inputCls}>
            <option value="">— Seleccionar —</option>
            <option value="1">1 fase</option>
            <option value="2">2 fases</option>
            <option value="3">3 fases</option>
          </select>
        </Field>
        <Field label="¿Requiere Match / Contrapartida?">
          <select value={form.requiere_match} onChange={set('requiere_match')} className={inputCls}>
            <option value="">— Seleccionar —</option>
            <option value="true">Sí</option>
            <option value="false">No</option>
          </select>
        </Field>
        <Field label="¿Requiere Socio / Consorcio?">
          <select value={form.requiere_socio} onChange={set('requiere_socio')} className={inputCls}>
            <option value="">— Seleccionar —</option>
            <option value="true">Sí</option>
            <option value="false">No</option>
          </select>
        </Field>
      </SectionCard>

      {/* ── 2. Prioridades ── */}
      <SectionCard title="Prioridades">
        <Field label="Prioridades Temáticas" full>
          <textarea rows={2} value={form.prioridades_tematicas} onChange={set('prioridades_tematicas')} className={inputCls + ' resize-none'} placeholder="Áreas temáticas y sectores…" />
        </Field>
        <Field label="Prioridades Geográficas">
          <textarea rows={2} value={form.prioridades_geograficas} onChange={set('prioridades_geograficas')} className={inputCls + ' resize-none'} placeholder="Regiones, provincias, distritos…" />
        </Field>
        <Field label="Prioridades Demográficas">
          <textarea rows={2} value={form.prioridades_demograficas} onChange={set('prioridades_demograficas')} className={inputCls + ' resize-none'} placeholder="Población objetivo…" />
        </Field>
      </SectionCard>

      {/* ── 3. Aspectos Financieros ── */}
      <SectionCard title="Aspectos Financieros">
        <Field label="Presupuesto Total (USD)">
          <input type="number" value={form.presupuesto_total} onChange={set('presupuesto_total')} className={inputCls} placeholder="500000" />
        </Field>
        <Field label="ICR Permitido (%)">
          <input type="number" value={form.icr_permitido} onChange={set('icr_permitido')} className={inputCls} placeholder="10" />
        </Field>
        <Field label="Duración (meses)">
          <input type="number" value={form.duracion_meses} onChange={set('duracion_meses')} className={inputCls} placeholder="24" />
        </Field>
      </SectionCard>

      {/* ── 4. Fechas Clave ── */}
      <SectionCard title="Fechas Clave">
        <Field label="Deadline Preguntas">
          <input type="date" value={form.deadline_preguntas} onChange={set('deadline_preguntas')} className={inputCls} />
        </Field>
        <Field label="Deadline Envío Propuesta">
          <input type="date" value={form.deadline_envio} onChange={set('deadline_envio')} className={inputCls} />
        </Field>
        <Field label="Probable Respuesta">
          <input type="date" value={form.fecha_probable_respuesta} onChange={set('fecha_probable_respuesta')} className={inputCls} />
        </Field>
        <Field label="Probable Inicio del Proyecto">
          <input type="date" value={form.fecha_probable_inicio} onChange={set('fecha_probable_inicio')} className={inputCls} />
        </Field>
        <Field label="Probable Fin del Proyecto">
          <input type="date" value={form.fecha_probable_fin} onChange={set('fecha_probable_fin')} className={inputCls} />
        </Field>
      </SectionCard>

      {/* ── 5. Contexto y Objetivos ── */}
      <SectionCard title="Contexto y Objetivos">
        <Field label="Contexto / Antecedentes" full>
          <textarea rows={4} value={form.contexto} onChange={set('contexto')} className={inputCls + ' resize-y'} placeholder="Descripción del contexto según el donante…" />
        </Field>
        <Field label="Objetivo General" full>
          <textarea rows={3} value={form.objetivo_general} onChange={set('objetivo_general')} className={inputCls + ' resize-y'} placeholder="Objetivo principal de la convocatoria…" />
        </Field>
        <Field label="Objetivos Específicos / Resultados" full>
          <textarea rows={4} value={form.objetivos_especificos} onChange={set('objetivos_especificos')} className={inputCls + ' resize-y'} placeholder="Uno por línea…" />
        </Field>
        <Field label="Puntos Clave / Requisitos de Elegibilidad" full>
          <textarea rows={4} value={form.puntos_clave} onChange={set('puntos_clave')} className={inputCls + ' resize-y'} placeholder="Restricciones, criterios, notas importantes…" />
        </Field>
      </SectionCard>
    </div>
  )
}
