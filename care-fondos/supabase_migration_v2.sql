-- ============================================================
-- CARE Fondos — Migración v2: Hoja Resumen completa
-- Ejecutar en: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

ALTER TABLE propuestas
  ADD COLUMN IF NOT EXISTS link_carpeta              TEXT,
  ADD COLUMN IF NOT EXISTS prioridades_tematicas     TEXT,
  ADD COLUMN IF NOT EXISTS gerencia                  TEXT,
  ADD COLUMN IF NOT EXISTS prioridades_geograficas   TEXT,
  ADD COLUMN IF NOT EXISTS prioridades_demograficas  TEXT,
  ADD COLUMN IF NOT EXISTS marcador_genero           TEXT,
  ADD COLUMN IF NOT EXISTS duracion_meses            INTEGER,
  ADD COLUMN IF NOT EXISTS modalidad_desembolso      TEXT DEFAULT 'Subvención',
  ADD COLUMN IF NOT EXISTS requiere_socio            BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS fases_propuesta           TEXT,
  ADD COLUMN IF NOT EXISTS deadline_preguntas        DATE,
  ADD COLUMN IF NOT EXISTS deadline_envio            DATE,
  ADD COLUMN IF NOT EXISTS fecha_probable_respuesta  DATE,
  ADD COLUMN IF NOT EXISTS fecha_probable_inicio     DATE,
  ADD COLUMN IF NOT EXISTS fecha_probable_fin        DATE,
  ADD COLUMN IF NOT EXISTS contexto                  TEXT,
  ADD COLUMN IF NOT EXISTS objetivo_general          TEXT,
  ADD COLUMN IF NOT EXISTS objetivos_especificos     TEXT,
  ADD COLUMN IF NOT EXISTS puntos_clave              TEXT;
