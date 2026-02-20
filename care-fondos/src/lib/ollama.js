const OLLAMA_URL = 'http://localhost:11434/api/generate'
const MODEL = 'llama3.2'

function prepararTexto(texto, maxChars = 14000) {
  if (texto.length <= maxChars) return texto
  const inicio = texto.slice(0, 10000)
  const final  = texto.slice(-4000)
  return inicio + '\n\n[... texto intermedio omitido ...]\n\n' + final
}

const PROMPT_TEMPLATE = (texto) => `
Eres un analista experto en cooperación internacional para CARE Perú.
Debes extraer información de una convocatoria de fondos de donantes.

REGLAS ABSOLUTAS:
1. NUNCA inventes, supongas ni inferencias datos que no estén EXPLÍCITAMENTE en el texto.
2. Si un dato no aparece en el texto devuelve null. Sin excepciones.
3. Fechas en formato YYYY-MM-DD. Si solo ves mes/año usa el último día del mes.
4. Números solo dígitos sin símbolos (500000 no "$500,000").
5. Porcentajes solo el número (10 no "10%").
6. Booleanos: true o false, nunca strings.
7. Responde ÚNICAMENTE con el JSON. Cero texto adicional.

DESCRIPCIÓN DE CADA CAMPO:
- titulo: Nombre oficial de la convocatoria
- donante: Organización que financia (ej: USAID, ECHO, AECID)
- prioridades_tematicas: Áreas temáticas y sectores que financia
- gerencia: Área o gerencia interna de CARE que lideraría (si se menciona)
- prioridades_geograficas: Regiones, países, provincias o distritos de intervención
- prioridades_demograficas: Población objetivo (mujeres, niños, pueblos indígenas, etc.)
- duracion_meses: Duración del proyecto en meses (número entero)
- presupuesto_total: Monto máximo del financiamiento (solo número)
- icr_permitido: Porcentaje de costos indirectos que cubre el donante (solo número)
- modalidad_desembolso: "Subvención" si es grant, "Servicio" si es contrato de servicio
- requiere_match: true si exige contrapartida o co-financiamiento
- requiere_socio: true si exige trabajar con socio o en consorcio
- fases_propuesta: Número de etapas de postulación ("1", "2" o "3")
- deadline_preguntas: Fecha límite para enviar preguntas al donante (YYYY-MM-DD)
- deadline_envio: Fecha límite para presentar la propuesta (YYYY-MM-DD)
- fecha_probable_respuesta: Fecha estimada de comunicación de resultados (YYYY-MM-DD)
- fecha_probable_inicio: Fecha probable de inicio del proyecto (YYYY-MM-DD)
- fecha_probable_fin: Fecha probable de cierre del proyecto (YYYY-MM-DD)
- contexto: Antecedentes y justificación según el documento
- objetivo_general: Objetivo principal tal como lo describe el donante
- objetivos_especificos: Objetivos específicos o resultados esperados, separados por salto de línea
- puntos_clave: Requisitos de elegibilidad, restricciones y puntos críticos

JSON A COMPLETAR (devuelve SOLO esto):
{
  "titulo": null,
  "donante": null,
  "prioridades_tematicas": null,
  "gerencia": null,
  "prioridades_geograficas": null,
  "prioridades_demograficas": null,
  "duracion_meses": null,
  "presupuesto_total": null,
  "icr_permitido": null,
  "modalidad_desembolso": null,
  "requiere_match": null,
  "requiere_socio": null,
  "fases_propuesta": null,
  "deadline_preguntas": null,
  "deadline_envio": null,
  "fecha_probable_respuesta": null,
  "fecha_probable_inicio": null,
  "fecha_probable_fin": null,
  "contexto": null,
  "objetivo_general": null,
  "objetivos_especificos": null,
  "puntos_clave": null
}

TEXTO DE LA CONVOCATORIA:
${prepararTexto(texto)}
`

export async function analizarConvocatoria(texto) {
  const response = await fetch(OLLAMA_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      prompt: PROMPT_TEMPLATE(texto),
      format: 'json',
      stream: false,
      options: { temperature: 0, num_predict: 2000 },
    }),
  })

  if (!response.ok) {
    throw new Error(`Ollama respondió con error ${response.status}. ¿Está corriendo Ollama con CORS habilitado?`)
  }

  const data = await response.json()
  try {
    return JSON.parse(data.response)
  } catch {
    throw new Error('Ollama no devolvió un JSON válido. Intenta de nuevo o revisa el documento.')
  }
}
