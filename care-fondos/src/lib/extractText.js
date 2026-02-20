import * as pdfjsLib from 'pdfjs-dist'
import mammoth from 'mammoth'
import * as XLSX from 'xlsx'
import JSZip from 'jszip'

// Worker pdfjs-dist v5
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).href

// ─────────────────────────────────────────────
// PDF
// ─────────────────────────────────────────────
async function extractFromPdf(file) {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const pages = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    pages.push(content.items.map(item => item.str).join(' '))
  }
  return pages.join('\n')
}

// ─────────────────────────────────────────────
// Word (.docx)
// ─────────────────────────────────────────────
async function extractFromDocx(file) {
  const arrayBuffer = await file.arrayBuffer()
  const result = await mammoth.extractRawText({ arrayBuffer })
  return result.value
}

// ─────────────────────────────────────────────
// Excel (.xlsx, .xls)
// ─────────────────────────────────────────────
async function extractFromXlsx(file) {
  const arrayBuffer = await file.arrayBuffer()
  const workbook = XLSX.read(arrayBuffer, { type: 'array' })
  return workbook.SheetNames.map(name => {
    const sheet = workbook.Sheets[name]
    return `[Hoja: ${name}]\n` + XLSX.utils.sheet_to_csv(sheet)
  }).join('\n\n')
}

// ─────────────────────────────────────────────
// PowerPoint (.pptx)
// ─────────────────────────────────────────────
async function extractFromPptx(file) {
  const arrayBuffer = await file.arrayBuffer()
  const zip = await JSZip.loadAsync(arrayBuffer)
  const slideKeys = Object.keys(zip.files)
    .filter(name => /ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort()

  const slideTexts = await Promise.all(
    slideKeys.map(async (key, idx) => {
      const xml = await zip.files[key].async('text')
      const matches = xml.match(/<a:t[^>]*>([^<]*)<\/a:t>/g) || []
      const text = matches.map(m => m.replace(/<[^>]+>/g, '')).join(' ')
      return `[Diapositiva ${idx + 1}] ${text}`
    })
  )
  return slideTexts.join('\n')
}

// ─────────────────────────────────────────────
// URL (página web) — vía proxy CORS público
// ─────────────────────────────────────────────
export async function extractFromUrl(url) {
  const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`
  const res = await fetch(proxyUrl)
  if (!res.ok) throw new Error(`No se pudo acceder a la URL: ${url}`)
  const data = await res.json()
  // Parsear HTML y extraer solo el texto visible
  const parser = new DOMParser()
  const doc = parser.parseFromString(data.contents, 'text/html')
  // Eliminar scripts, estilos y nav
  doc.querySelectorAll('script, style, nav, header, footer').forEach(el => el.remove())
  return doc.body?.innerText ?? doc.body?.textContent ?? ''
}

// ─────────────────────────────────────────────
// Dispatcher por tipo de archivo
// ─────────────────────────────────────────────
export async function extractFromFile(file) {
  const name = file.name.toLowerCase()
  if (name.endsWith('.pdf'))                        return extractFromPdf(file)
  if (name.endsWith('.docx'))                       return extractFromDocx(file)
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) return extractFromXlsx(file)
  if (name.endsWith('.pptx'))                       return extractFromPptx(file)
  throw new Error(`Formato no soportado: ${file.name}`)
}

// Extensiones aceptadas para el input
export const ACCEPTED_EXTENSIONS = '.pdf,.docx,.xlsx,.xls,.pptx'

export function getFileIcon(filename) {
  const name = filename.toLowerCase()
  if (name.endsWith('.pdf'))   return { icon: '📄', color: 'text-red-500' }
  if (name.endsWith('.docx'))  return { icon: '📝', color: 'text-blue-500' }
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) return { icon: '📊', color: 'text-green-600' }
  if (name.endsWith('.pptx'))  return { icon: '📑', color: 'text-orange-500' }
  return { icon: '📎', color: 'text-gray-500' }
}
