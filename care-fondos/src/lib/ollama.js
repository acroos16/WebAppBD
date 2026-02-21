const OLLAMA_URL = 'http://localhost:11434/api/generate'
const MODEL = 'llama3.1:8b'

function prepararTexto(texto, maxChars = 12000) {
  if (texto.length <= maxChars) return texto
  const inicio = texto.slice(0, 8000)
  const final  = texto.slice(-4000)
  return inicio + '\n\n[...]\n\n' + final
}

// ── Llamada base a Ollama ──────────────────────────────────────────────────────
async function llamarOllama(prompt) {
  const response = await fetch(OLLAMA_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      prompt,
      format: 'json',
      stream: false,
      options: { temperature: 0, num_predict: 2048 },
    }),
  })
  if (!response.ok) {
    throw new Error(`Ollama error ${response.status}. ¿Está corriendo Ollama con CORS habilitado?`)
  }
  const data = await response.json()
  try {
    return JSON.parse(data.response)
  } catch {
    return {}
  }
}

// ── PASO 1: Datos básicos e identidad ─────────────────────────────────────────
function promptBasicos(texto) {
  return `Extract the following fields from this funding call document and return ONLY a JSON object.
Use null for any field not found in the text. Use EXACTLY these field names.

Fields to extract:
- "titulo": Official name of the funding call (string)
- "donante": Funding organization name, e.g. USAID, ECHO, EU (string)
- "gerencia": Internal CARE department that would lead this, if mentioned (string or null)
- "modalidad_desembolso": "Subvención" if it is a grant, "Servicio" if it is a service contract (string or null)
- "fases_propuesta": Number of application stages as a string: "1", "2" or "3" (string or null)
- "requiere_match": true if co-financing or matching funds are required, false if not (boolean or null)
- "requiere_socio": true if working with a consortium or partner is required (boolean or null)
- "duracion_meses": Project duration in months, integer only (number or null)
- "presupuesto_total": Maximum funding amount, digits only, no currency symbols (number or null)
- "icr_permitido": Indirect cost rate percentage allowed, number only (number or null)

Return JSON like: {"titulo": "...", "donante": "...", ...}

DOCUMENT:
${prepararTexto(texto)}
`
}

// ── PASO 2: Prioridades y fechas ──────────────────────────────────────────────
function promptFechasYPrioridades(texto) {
  return `Extract the following fields from this funding call document and return ONLY a JSON object.
Use null for any field not found. Use EXACTLY these field names.

Fields to extract:
- "prioridades_tematicas": Thematic areas and sectors the funding covers (string or null)
- "prioridades_geograficas": Geographic focus: regions, countries, provinces, districts (string or null)
- "prioridades_demograficas": Target population e.g. women, children, indigenous peoples (string or null)
- "deadline_preguntas": Deadline to submit questions to the donor, format YYYY-MM-DD (string or null)
- "deadline_envio": Deadline to submit the proposal, format YYYY-MM-DD (string or null)
- "fecha_probable_respuesta": Estimated date for results notification, format YYYY-MM-DD (string or null)
- "fecha_probable_inicio": Estimated project start date, format YYYY-MM-DD (string or null)
- "fecha_probable_fin": Estimated project end date, format YYYY-MM-DD (string or null)

Return JSON like: {"prioridades_tematicas": "...", "deadline_envio": "2025-06-30", ...}

DOCUMENT:
${prepararTexto(texto)}
`
}

// ── PASO 3: Narrativa ─────────────────────────────────────────────────────────
function promptNarrativa(texto) {
  return `Extract the following fields from this funding call document and return ONLY a JSON object.
Use null for any field not found. Use EXACTLY these field names.

Fields to extract:
- "contexto": Background, context and justification described in the document (string or null)
- "objetivo_general": Main objective of the funding call as stated by the donor (string or null)
- "objetivos_especificos": Specific objectives or expected results, one per line (string or null)
- "puntos_clave": Eligibility requirements, restrictions, and critical notes (string or null)

Return JSON like: {"contexto": "...", "objetivo_general": "...", ...}

DOCUMENT:
${prepararTexto(texto)}
`
}

// ── Plantilla base vacía ──────────────────────────────────────────────────────
const BASE_TEMPLATE = {
  titulo: null,
  donante: null,
  prioridades_tematicas: null,
  gerencia: null,
  prioridades_geograficas: null,
  prioridades_demograficas: null,
  duracion_meses: null,
  presupuesto_total: null,
  icr_permitido: null,
  modalidad_desembolso: null,
  requiere_match: null,
  requiere_socio: null,
  fases_propuesta: null,
  deadline_preguntas: null,
  deadline_envio: null,
  fecha_probable_respuesta: null,
  fecha_probable_inicio: null,
  fecha_probable_fin: null,
  contexto: null,
  objetivo_general: null,
  objetivos_especificos: null,
  puntos_clave: null,
}

// ── Función principal: 3 llamadas paralelas ───────────────────────────────────
export async function analizarConvocatoria(texto) {
  const [basicos, fechas, narrativa] = await Promise.all([
    llamarOllama(promptBasicos(texto)),
    llamarOllama(promptFechasYPrioridades(texto)),
    llamarOllama(promptNarrativa(texto)),
  ])

  // Merge: BASE_TEMPLATE ← basicos ← fechas ← narrativa
  return {
    ...BASE_TEMPLATE,
    ...basicos,
    ...fechas,
    ...narrativa,
  }
}
