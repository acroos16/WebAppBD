export default function Pipeline() {
  return (
    <div className="p-6">
      {/* 1. Pestañas de Navegación (Tabs) */}
      <div className="border-b border-[#d0d7de] mb-5">
        <nav className="-mb-px flex gap-4" aria-label="Tabs">
          <button className="border-b-2 border-[#fd8c73] text-[#24292f] font-semibold pb-2 px-1 text-sm">
            Convocatorias abiertas <span className="ml-1 bg-[#d0d7de] text-[#24292f] rounded-full px-2 py-0.5 text-xs">2</span>
          </button>
          <button className="border-b-2 border-transparent text-[#57606a] hover:text-[#24292f] hover:border-[#d0d7de] pb-2 px-1 text-sm transition-colors">
            En evaluación
          </button>
          <button className="border-b-2 border-transparent text-[#57606a] hover:text-[#24292f] hover:border-[#d0d7de] pb-2 px-1 text-sm transition-colors">
            Cerradas
          </button>
        </nav>
      </div>

      {/* 2. Barra de Búsqueda y Filtros */}
      <div className="flex gap-3 mb-5">
        <input 
          type="text" 
          placeholder="Buscar oportunidades, donantes o palabras clave..." 
          className="flex-1 bg-[#f6f8fa] border border-[#d0d7de] rounded-md px-3 py-1.5 text-sm text-[#24292f] placeholder-[#57606a] focus:bg-white focus:border-[#0969da] focus:ring-[3px] focus:ring-[rgba(9,105,218,0.3)] outline-none transition-all"
        />
        <button className="bg-[#f6f8fa] text-[#24292f] px-3 py-1.5 text-sm font-medium rounded-md border border-[#d0d7de] shadow-sm hover:bg-[#f3f4f6] transition-colors">
          Filtros
        </button>
      </div>

      {/* 3. Lista de Oportunidades (Estilo Issues) */}
      <div className="border border-[#d0d7de] rounded-md">
        <div className="bg-[#f6f8fa] border-b border-[#d0d7de] px-4 py-3 rounded-t-md flex justify-between items-center">
          <span className="text-sm font-semibold text-[#24292f]">
            2 oportunidades encontradas
          </span>
          <span className="text-xs text-[#57606a] cursor-pointer hover:text-[#0969da]">Ordenado por: Más recientes ▼</span>
        </div>

        <div className="divide-y divide-[#d0d7de]">
          {/* Item 1 */}
          <div className="p-4 flex items-start gap-3 hover:bg-[#f6f8fa] transition-colors">
            <div className="mt-1 text-[#2da44e]">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 9.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"></path>
                <path fillRule="evenodd" d="M8 0a8 8 0 100 16A8 8 0 008 0zM1.5 8a6.5 6.5 0 1113 0 6.5 6.5 0 01-13 0z"></path>
              </svg>
            </div>
            <div className="flex-1">
              <a href="#" className="text-[#0969da] font-semibold text-base hover:underline">
                Fondo de Innovación Climática y Social 2026
              </a>
              <p className="text-xs text-[#57606a] mt-1">
                #102 ingresado hace 2 días por Cooperación Alemana (GIZ)
              </p>
            </div>
            <div className="flex gap-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border border-[#d0d7de] text-[#57606a]">Sostenibilidad</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border border-[#d0d7de] bg-[#ddf4ff] text-[#0969da]">Alta prioridad</span>
            </div>
          </div>

          {/* Item 2 */}
          <div className="p-4 flex items-start gap-3 hover:bg-[#f6f8fa] transition-colors">
            <div className="mt-1 text-[#2da44e]">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 9.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"></path>
                <path fillRule="evenodd" d="M8 0a8 8 0 100 16A8 8 0 008 0zM1.5 8a6.5 6.5 0 1113 0 6.5 6.5 0 01-13 0z"></path>
              </svg>
            </div>
            <div className="flex-1">
              <a href="#" className="text-[#0969da] font-semibold text-base hover:underline">
                Subvención para Empoderamiento Económico
              </a>
              <p className="text-xs text-[#57606a] mt-1">
                #103 ingresado hoy por Fundación Gates
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}