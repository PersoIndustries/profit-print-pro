-- Script SQL para validar seguridad de todas las tablas
-- Este script verifica:
-- 1. RLS está habilitado en todas las tablas
-- 2. Políticas RLS existen para todas las tablas
-- 3. Todas las tablas tienen user_id (excepto tablas del sistema)

-- Verificar RLS habilitado
SELECT 
  tablename as "Tabla",
  CASE 
    WHEN rowsecurity THEN '✅ RLS Habilitado'
    ELSE '❌ RLS NO Habilitado'
  END as "Estado RLS"
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Verificar políticas RLS por tabla
SELECT 
  tablename as "Tabla",
  COUNT(*) as "Número de Políticas",
  STRING_AGG(policyname, ', ') as "Políticas"
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- Verificar tablas sin políticas RLS
SELECT 
  t.tablename as "Tabla Sin Políticas"
FROM pg_tables t
LEFT JOIN pg_policies p ON t.tablename = p.tablename AND p.schemaname = 'public'
WHERE t.schemaname = 'public'
  AND t.rowsecurity = true
  AND p.policyname IS NULL
ORDER BY t.tablename;

-- Verificar columnas user_id
SELECT 
  table_name as "Tabla",
  CASE 
    WHEN EXISTS (
      SELECT 1 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = t.table_name 
      AND column_name = 'user_id'
    ) THEN '✅ Tiene user_id'
    ELSE '❌ NO tiene user_id'
  END as "Estado user_id"
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
  AND table_name NOT IN ('tier_features', 'promo_codes') -- Tablas del sistema
ORDER BY table_name;

-- Resumen de seguridad
SELECT 
  'Total Tablas' as "Métrica",
  COUNT(*) as "Valor"
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'

UNION ALL

SELECT 
  'Tablas con RLS' as "Métrica",
  COUNT(*) as "Valor"
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = true

UNION ALL

SELECT 
  'Tablas con Políticas' as "Métrica",
  COUNT(DISTINCT tablename) as "Valor"
FROM pg_policies
WHERE schemaname = 'public'

UNION ALL

SELECT 
  'Tablas con user_id' as "Métrica",
  COUNT(DISTINCT table_name) as "Valor"
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name = 'user_id';

