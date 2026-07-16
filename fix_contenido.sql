-- ============================================================
-- Script para agregar las claves de contenido que faltan
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- Insertar claves que podrían faltar (sin duplicar las existentes)
INSERT INTO public.contenido_sitio (clave, valor) VALUES
  ('heroDesc',     'En Oleya elaboramos galletas de mantequilla decoradas y personalizadas, galletas new york y pays artesanales con ingredientes naturales seleccionados. Cada bocado es una bomba de sabor.'),
  ('menuTitle',    'El Menú'),
  ('menuSub',      'Elaborados diariamente con recetas propias y los mejores ingredientes.'),
  ('histP1',       'En diciembre de 2022, Maria Jose Novelo Triay comenzó con algunos utensilios de cocina y el horno de su mamá. Los primeros pedidos llegaron de familiares y amigos.'),
  ('histP2',       'Con esfuerzo logró su Kitchen Aid, perfeccionó su receta y construyó una marca con identidad propia — Oleya by M.J.'),
  ('bannerTitle',  'Pedidos especiales y personalizados'),
  ('bannerSub',    'Bodas, quinceañeros, cumpleaños. Creamos el pastel de tus sueños con los sabores que más amas.')
ON CONFLICT (clave) DO NOTHING;

-- Verificar que todas las claves existen
SELECT clave, valor FROM public.contenido_sitio ORDER BY clave;
