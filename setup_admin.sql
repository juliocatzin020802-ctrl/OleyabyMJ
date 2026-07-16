-- ================================================================
-- OLEYA BY M.J. — CONFIGURACIÓN DE ADMINISTRADOR
-- ================================================================
-- Ejecuta este script en el SQL Editor de tu panel de Supabase:
--   https://supabase.com/dashboard → Tu proyecto → SQL Editor
-- ================================================================

-- 1. Confirmar el correo electrónico del administrador (admin@oleya.mx)
--    Esto permite que pueda iniciar sesión sin necesidad de verificar su correo.
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE email = 'admin@oleya.mx'
  AND email_confirmed_at IS NULL;

-- 2. Asegurar que el admin exista en la tabla public.usuarios
INSERT INTO public.usuarios (id_usuario, nombre, email)
SELECT id, 'Administrador Oleya', 'admin@oleya.mx'
FROM auth.users
WHERE email = 'admin@oleya.mx'
ON CONFLICT (id_usuario) DO UPDATE
SET nombre = 'Administrador Oleya';

-- 3. Registrar al usuario como ADMINISTRADOR en la tabla public.administradores
INSERT INTO public.administradores (id_admin, nombre, email)
SELECT id, 'Administrador Oleya', 'admin@oleya.mx'
FROM auth.users
WHERE email = 'admin@oleya.mx'
ON CONFLICT (id_admin) DO UPDATE
SET nombre = 'Administrador Oleya';

-- 4. (OPCIONAL) Confirmar TODOS los correos de usuarios registrados
--    Descomenta las líneas siguientes si quieres que todos los usuarios
--    existentes puedan iniciar sesión sin verificar su correo:
--
-- UPDATE auth.users
-- SET email_confirmed_at = NOW(), confirmed_at = NOW()
-- WHERE email_confirmed_at IS NULL;

-- 5. Verificar que todo quedó bien
SELECT 'ADMINISTRADOR CREADO' AS resultado,
       a.id_admin,
       a.nombre,
       a.email
FROM public.administradores a
WHERE a.email = 'admin@oleya.mx';
