import { NavLink } from 'react-router-dom'

const nav = [
  {
    to: '/',
    label: 'Radar',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="2"/><path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14"/>
      </svg>
    ),
  },
  {
    to: '/gonogo',
    label: 'Go / No-Go',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
      </svg>
    ),
  },
  {
    to: '/workspace',
    label: 'Workspace',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
      </svg>
    ),
  },
  {
    to: '/pipeline',
    label: 'Pipeline',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
      </svg>
    ),
  },
]

export default function Sidebar() {
  return (
    <aside className="w-64 min-h-screen bg-[#f6f8fa] border-r border-[#d0d7de] flex flex-col flex-shrink-0">

      {/* Brand */}
      <div className="px-5 py-6 border-b border-[#d0d7de]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-[#24292f] flex items-center justify-center flex-shrink-0 shadow-sm border border-[#d0d7de]">
            <span className="text-white text-sm font-bold tracking-tight">C</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-[#24292f] leading-none">CARE Perú</p>
            <p className="text-xs text-[#57606a] leading-none mt-1">Captación de Fondos</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-6 space-y-1">
        {nav.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-[#ddf4ff] text-[#0969da]' /* Azul claro fondo, texto azul GitHub */
                  : 'text-[#24292f] hover:bg-[#ebecf0]' /* Texto oscuro, hover gris */
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className={isActive ? 'text-[#0969da]' : 'text-[#57606a]'}>
                  {icon}
                </span>
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-[#d0d7de]">
        <p className="text-xs text-[#57606a] font-medium">v1.0 · Uso interno</p>
      </div>
    </aside>
  )
}