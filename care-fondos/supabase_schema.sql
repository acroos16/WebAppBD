-- ============================================================
-- CARE Fondos — Script de creación de tablas
-- Ejecutar en: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- 1. TABLA: propuestas (registro central de cada oportunidad)
CREATE TABLE propuestas (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo                  TEXT NOT NULL,
  donante                 TEXT,
  presupuesto_total       NUMERIC,
  icr_permitido           NUMERIC,
  requiere_match          BOOLEAN DEFAULT FALSE,
  prioridades_estrategicas TEXT,
  estado                  TEXT NOT NULL DEFAULT 'Radar'
                            CHECK (estado IN (
                              'Radar',
                              'En Evaluación',
                              'En Diseño',
                              'Presentada',
                              'Aprobada',
                              'Archivada'
                            )),
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABLA: tareas (Kanban vinculado a cada propuesta)
CREATE TABLE tareas (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  propuesta_id  UUID NOT NULL REFERENCES propuestas(id) ON DELETE CASCADE,
  titulo        TEXT NOT NULL,
  responsable   TEXT,
  estado        TEXT NOT NULL DEFAULT 'Pendiente'
                  CHECK (estado IN ('Pendiente', 'En Proceso', 'Completado')),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABLA: adjuntos (URLs y documentos vinculados a cada propuesta)
CREATE TABLE adjuntos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  propuesta_id  UUID NOT NULL REFERENCES propuestas(id) ON DELETE CASCADE,
  nombre        TEXT NOT NULL,
  url           TEXT NOT NULL,
  tipo          TEXT,   -- ej: 'Drive', 'PDF Final', 'TdR', 'Presupuesto'
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- POLÍTICAS RLS — Desactivadas para uso interno libre
-- ============================================================
ALTER TABLE propuestas DISABLE ROW LEVEL SECURITY;
ALTER TABLE tareas     DISABLE ROW LEVEL SECURITY;
ALTER TABLE adjuntos   DISABLE ROW LEVEL SECURITY;
