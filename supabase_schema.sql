
-- ====================================================================
-- OLEYA BY M.J. â€” ESQUEMA DE BASE DE DATOS EN POSTGRESQL (SUPABASE)
-- ====================================================================

-- 0. Limpieza previa de tablas en orden inverso de dependencias
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.es_admin();

DROP TABLE IF EXISTS public.detalle_pedidos CASCADE;
DROP TABLE IF EXISTS public.pedidos CASCADE;
DROP TABLE IF EXISTS public.productos CASCADE;
DROP TABLE IF EXISTS public.etiquetas CASCADE;
DROP TABLE IF EXISTS public.usuarios CASCADE;
DROP TABLE IF EXISTS public.administradores CASCADE;
DROP TABLE IF EXISTS public.contenido_sitio CASCADE;

-- 1. TABLA DE ADMINISTRADORES
-- Vinculada directamente con auth.users para dar permisos de administraciÃ³n
CREATE TABLE public.administradores (
    id_admin UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    nombre VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL,
    fecha_registro TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (id_admin),
    CONSTRAINT uq_administradores_email UNIQUE (email)
);

-- FunciÃ³n auxiliar para verificar si el usuario logueado es Administrador
CREATE OR REPLACE FUNCTION public.es_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.administradores
        WHERE id_admin = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. TABLA DE USUARIOS (Clientes / Perfiles de usuario)
-- Su ID es el mismo UUID de auth.users(id)
CREATE TABLE public.usuarios (
    id_usuario UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    nombre VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL,
    telefono VARCHAR(20) NULL,
    direccion VARCHAR(255) NULL,
    colonia VARCHAR(100) NULL,
    fecha_registro TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (id_usuario),
    CONSTRAINT uq_usuarios_email UNIQUE (email)
);

-- 3. ETIQUETAS
CREATE TABLE public.etiquetas (
    id_etiqueta UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(50) NOT NULL,
    CONSTRAINT uq_etiquetas_nombre UNIQUE (nombre)
);

-- 4. TABLA DE PRODUCTOS
CREATE TABLE public.productos (
    id_producto UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT NULL,
    precio NUMERIC(10,2) NOT NULL CONSTRAINT chk_productos_precio CHECK (precio >= 0),
    emoji VARCHAR(10) NULL,
    foto_url VARCHAR(500) NULL,
    id_etiqueta UUID NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT fk_productos_etiqueta
        FOREIGN KEY (id_etiqueta) REFERENCES public.etiquetas(id_etiqueta)
        ON UPDATE CASCADE ON DELETE SET NULL
);

-- 5. TABLA DE PEDIDOS
CREATE TABLE public.pedidos (
    id_pedido UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_usuario UUID NULL,
    nombre_cliente VARCHAR(150) NOT NULL,
    telefono_cliente VARCHAR(20) NULL,
    notas TEXT NULL,
    canal VARCHAR(20) NOT NULL DEFAULT 'whatsapp',
    estado VARCHAR(50) NOT NULL DEFAULT 'pendiente',
    fecha_pedido TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT fk_pedidos_usuario
        FOREIGN KEY (id_usuario) REFERENCES public.usuarios(id_usuario)
        ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT chk_pedidos_estado 
        CHECK (estado IN ('pendiente','confirmado','en_preparacion','entregado','cancelado'))
);

-- 6. TABLA DE DETALLE_PEDIDOS
CREATE TABLE public.detalle_pedidos (
    id_detalle UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_pedido UUID NOT NULL,
    id_producto UUID NULL,
    descripcion_personalizada VARCHAR(255) NULL,
    cantidad INTEGER NOT NULL DEFAULT 1 CONSTRAINT chk_detalle_cantidad CHECK (cantidad > 0),
    precio_unitario NUMERIC(10,2) NOT NULL,
    CONSTRAINT fk_detalle_pedido
        FOREIGN KEY (id_pedido) REFERENCES public.pedidos(id_pedido)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_detalle_producto
        FOREIGN KEY (id_producto) REFERENCES public.productos(id_producto)
        ON UPDATE CASCADE ON DELETE SET NULL
);

-- 7. TABLA DE CONTENIDO_SITIO
CREATE TABLE public.contenido_sitio (
    id_contenido UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clave VARCHAR(100) NOT NULL,
    valor TEXT NULL,
    fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_contenido_clave UNIQUE (clave)
);

-- ====================================================================
-- CREACIÃ“N DE ÃNDICES ADICIONALES
-- ====================================================================
CREATE INDEX idx_productos_etiqueta   ON public.productos(id_etiqueta);
CREATE INDEX idx_pedidos_usuario      ON public.pedidos(id_usuario);
CREATE INDEX idx_pedidos_estado       ON public.pedidos(estado);
CREATE INDEX idx_detalle_pedido       ON public.detalle_pedidos(id_pedido);
CREATE INDEX idx_detalle_producto     ON public.detalle_pedidos(id_producto);
-- FunciÃ³n que se ejecuta tras el evento de registro
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.usuarios (id_usuario, nombre, email, telefono, direccion, colonia)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nombre', 'Usuario Nuevo'),
    NEW.email,
    NEW.raw_user_meta_data->>'telefono',
    NEW.raw_user_meta_data->>'direccion',
    NEW.raw_user_meta_data->>'colonia'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Disparador en la tabla interna de Supabase
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
-- Habilitar RLS en las tablas crÃ­ticas
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.detalle_pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.etiquetas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contenido_sitio ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- POLÃTICAS PARA LA TABLA: usuarios (Perfiles)
-- ==========================================

-- 1. Un usuario autenticado solo puede leer su propio perfil
CREATE POLICY "Permitir lectura de perfil propio"
ON public.usuarios FOR SELECT
TO authenticated
USING (auth.uid() = id_usuario OR public.es_admin());

-- 2. Un usuario autenticado puede actualizar sus propios datos
CREATE POLICY "Permitir actualizaciÃ³n de perfil propio"
ON public.usuarios FOR UPDATE
TO authenticated
USING (auth.uid() = id_usuario)
WITH CHECK (auth.uid() = id_usuario);

-- 3. Los administradores tienen control total sobre todos los perfiles
CREATE POLICY "Administradores control total usuarios"
ON public.usuarios FOR ALL
TO authenticated
USING (public.es_admin());


-- ==========================================
-- POLÃTICAS PARA LA TABLA: pedidos
-- ==========================================

-- 1. Los clientes pueden ver sus propios pedidos. Los admins ven todos.
CREATE POLICY "Ver pedidos propios o todos si es admin"
ON public.pedidos FOR SELECT
TO authenticated
USING (auth.uid() = id_usuario OR public.es_admin());

-- 2. Los clientes y usuarios anÃ³nimos pueden insertar pedidos (hacer compras)
CREATE POLICY "Permitir crear pedidos"
ON public.pedidos FOR INSERT
TO anon, authenticated
WITH CHECK (
    -- Si estÃ¡ autenticado, el id_usuario debe ser el suyo
    (auth.role() = 'authenticated' AND auth.uid() = id_usuario)
    OR
    -- Si es anÃ³nimo, el id_usuario debe ser nulo (pedido express)
    (auth.role() = 'anon' AND id_usuario IS NULL)
);

-- 3. Solo los administradores pueden actualizar o eliminar pedidos
CREATE POLICY "Administradores control total pedidos"
ON public.pedidos FOR ALL
TO authenticated
USING (public.es_admin());


-- ==========================================
-- POLÃTICAS PARA LA TABLA: detalle_pedidos
-- ==========================================

CREATE POLICY "Lectura de detalles propia o admin"
ON public.detalle_pedidos FOR SELECT
TO anon, authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.pedidos p
        WHERE p.id_pedido = detalle_pedidos.id_pedido
          AND (p.id_usuario = auth.uid() OR public.es_admin())
    )
);

CREATE POLICY "InserciÃ³n de detalles para clientes o anon"
ON public.detalle_pedidos FOR INSERT
TO anon, authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.pedidos p
        WHERE p.id_pedido = detalle_pedidos.id_pedido
          AND (p.id_usuario = auth.uid() OR p.id_usuario IS NULL)
    )
);

CREATE POLICY "Admin control total detalle"
ON public.detalle_pedidos FOR ALL
TO authenticated
USING (public.es_admin());


-- ==========================================
-- POLÃTICAS PARA TABLAS PÃšBLICAS (Lectura abierta, escritura admin)
-- ==========================================

-- Productos
CREATE POLICY "Lectura de productos para todos" ON public.productos FOR SELECT TO anon, authenticated USING (activo = TRUE OR public.es_admin());
CREATE POLICY "Escritura de productos solo admins" ON public.productos FOR ALL TO authenticated USING (public.es_admin());

-- Etiquetas
CREATE POLICY "Lectura de etiquetas para todos" ON public.etiquetas FOR SELECT TO anon, authenticated USING (TRUE);
CREATE POLICY "Escritura de etiquetas solo admins" ON public.etiquetas FOR ALL TO authenticated USING (public.es_admin());

-- Contenido Sitio
CREATE POLICY "Lectura de contenido para todos" ON public.contenido_sitio FOR SELECT TO anon, authenticated USING (TRUE);
CREATE POLICY "Escritura de contenido solo admins" ON public.contenido_sitio FOR ALL TO authenticated USING (public.es_admin());
-- Insertar etiquetas base (con UUID generado dinÃ¡micamente)
INSERT INTO public.etiquetas (nombre) VALUES
  ('Favorita'), ('Popular'), ('Temporada'), ('Nuevo');

-- Insertar productos vinculados
INSERT INTO public.productos (nombre, descripcion, precio, emoji, foto_url, id_etiqueta) VALUES
  ('Galletas Decoradas de Mantequilla',
   'Galletas artesanales con glasÃ© royal decorado a mano. Perfectas para regalos y celebraciones especiales.',
   45.00, 'ðŸŒ¸', 'https://images.unsplash.com/photo-1573504286795-36a4a38c52a9?w=600&h=400&fit=crop&auto=format',
   (SELECT id_etiqueta FROM public.etiquetas WHERE nombre = 'Favorita')),
  ('New York Cookies',
   'Grandes, suaves y cargadas de chocolate. Receta estilo Nueva York con chispas premium y bordes dorados.',
   38.00, 'ðŸ«', 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=600&h=400&fit=crop&auto=format',
   (SELECT id_etiqueta FROM public.etiquetas WHERE nombre = 'Popular')),
  ('Pay de Manzana Decorado',
   'Pay artesanal con manzanas canela y masa trenzada decorada a mano. Calientito y reconfortante.',
   320.00, 'ðŸŽ', 'https://images.unsplash.com/photo-1621743478914-cc8a86d7e7b5?w=600&h=400&fit=crop&auto=format',
   (SELECT id_etiqueta FROM public.etiquetas WHERE nombre = 'Temporada'));

-- Contenido estático del sitio (todas las claves que usa el panel admin)
INSERT INTO public.contenido_sitio (clave, valor) VALUES
  ('brandName',    'Oleya by M.J.'),
  ('heroTitle',    'Sabor con'),
  ('heroAccent',   'Pasión'),
  ('heroDesc',     'En Oleya elaboramos galletas de mantequilla decoradas y personalizadas, galletas new york y pays artesanales con ingredientes naturales seleccionados. Cada bocado es una bomba de sabor.'),
  ('menuTitle',    'El Menú'),
  ('menuSub',      'Elaborados diariamente con recetas propias y los mejores ingredientes.'),
  ('histTitle',    'De una pequeña cocina a tu corazón'),
  ('histP1',       'En diciembre de 2022, Maria Jose Novelo Triay comenzó con algunos utensilios de cocina y el horno de su mamá. Los primeros pedidos llegaron de familiares y amigos.'),
  ('histP2',       'Con esfuerzo logró su Kitchen Aid, perfeccionó su receta y construyó una marca con identidad propia — Oleya by M.J.'),
  ('histYears',    '4'),
  ('bannerTitle',  'Pedidos especiales y personalizados'),
  ('bannerSub',    'Bodas, quinceañeros, cumpleaños. Creamos el pastel de tus sueños con los sabores que más amas.'),
  ('waNumber',     '529999584400'),
  ('address',      'Calle 21, Esquina. Col. México'),
  ('hours',        'Lunes a sábado de 9:00 a 18:00 hrs.');
