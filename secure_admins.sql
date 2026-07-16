-- ====================================================================
-- SCRIPT DE SEGURIDAD: PROTEGER LA TABLA DE ADMINISTRADORES
-- Ejecutar en Supabase SQL Editor:
--   https://supabase.com/dashboard → Tu proyecto → SQL Editor
-- ====================================================================

-- 1. Habilitar la seguridad de nivel de fila (RLS) en la tabla administradores
ALTER TABLE public.administradores ENABLE ROW LEVEL SECURITY;

-- 2. Eliminar políticas anteriores si existieran
DROP POLICY IF EXISTS "Admins control total sobre administradores" ON public.administradores;

-- 3. Crear política para que únicamente los administradores actuales puedan leer o modificar la tabla
-- Nota: La función public.es_admin() es SECURITY DEFINER, por lo que no causa recursión infinita.
CREATE POLICY "Admins control total sobre administradores"
ON public.administradores
FOR ALL
TO authenticated
USING (public.es_admin())
WITH CHECK (public.es_admin());

-- Verificar políticas activas
SELECT tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'administradores';
