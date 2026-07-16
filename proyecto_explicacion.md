# 🌸 Proyecto Oleya by M.J. — Repostería Artesanal

Este documento proporciona una explicación sencilla, breve y comprensible de la arquitectura, componentes y funcionamiento del proyecto **Oleya by M.J.**, una plataforma web para la visualización del menú, gestión de pedidos y administración de una repostería artesanal en Mérida.

El proyecto está dividido en cuatro pilares principales: **Interfaz**, **Base de Datos**, **Backend** y **Creaciones de API (Endpoints)**.

---

## 🖥️ 1. Interfaz (Frontend)

La interfaz es la cara visible de la aplicación, diseñada para que los clientes exploren los productos y realicen pedidos de forma intuitiva, y para que los administradores gestionen el negocio.

*   **Tecnologías Utilizadas**: Desarrollado con tecnologías web estándar (**HTML5**, **CSS3** y **JavaScript** de manera pura y sin frameworks complejos) para garantizar velocidad y facilidad de mantenimiento.
*   **Estilo y Experiencia Visual**: Posee un diseño moderno y artesanal con tipografías elegantes (como *Dancing Script* y *Josefin Sans*) y colores pastel que reflejan la calidez de la repostería hecha con amor.
*   **Secciones Principales**:
    *   **Inicio / Hero**: Presentación de la marca con animaciones dinámicas e imágenes de las galletas y pays.
    *   **Menú Dinámico**: Muestra las delicias disponibles (como galletas decoradas, New York cookies y pays) categorizadas por etiquetas (*Favorita, Popular, Temporada, Nuevo, Especial, Personalizado*). Los productos se cargan directamente desde la base de datos.
    *   **Historia**: Reseña del crecimiento del negocio de María José.
    *   **Contacto y Formulario de Pedidos**: Permite a los clientes seleccionar productos y cantidades para generar su compra.
*   **Flujos de Usuario**:
    1.  **Autenticación de Clientes**: Pantallas para iniciar sesión, registrarse (guardando nombre, dirección, colonia y teléfono) y ver el perfil personal.
    2.  **Generación de Pedidos**: Integración con la **API de WhatsApp**. Cuando un cliente hace un pedido, la interfaz redacta automáticamente un mensaje estructurado con todos los detalles (productos, dirección y notas) y abre un chat directo para finalizar la compra.
    3.  **Panel de Administración**: Un área protegida donde el administrador puede cambiar los textos del sitio (número de WhatsApp, horarios, descripciones) y añadir, editar o dar de baja productos del menú.

---

## 🗄️ 2. Base de Datos

La base de datos centraliza toda la información de la plataforma. Está alojada en **Supabase** (PostgreSQL) y protegida mediante políticas de seguridad avanzadas.

*   **Tecnología**: **PostgreSQL** relacional.
*   **Tablas Principales**:
    *   `usuarios`: Almacena la información de los clientes (nombre, correo, teléfono, dirección, colonia). Está sincronizada automáticamente con la autenticación de Supabase a través de un *Trigger* (disparador) de base de datos (`on_auth_user_created`).
    *   `administradores`: Guarda los identificadores (UUID) de los usuarios que tienen permisos de administración. Cuenta con una función llamada `es_admin()` para validar los accesos.
    *   `productos`: Catálogo que contiene el nombre, descripción, precio, emoji representativo, URL de imagen, estado (activo/inactivo) y su categoría.
    *   `etiquetas`: Clasificadores para los productos (por ejemplo, *Favorita*, *Temporada*).
    *   `pedidos` y `detalle_pedidos`: Registros de las compras hechas en la plataforma, permitiendo tanto pedidos vinculados a usuarios registrados como pedidos express (anónimos).
    *   `contenido_sitio`: Una tabla clave-valor utilizada para editar los textos dinámicos de la interfaz directamente desde el panel de administración, sin necesidad de reprogramar el código.
*   **Seguridad RLS (Row Level Security)**:
    *   Cualquier persona (incluso sin registrarse) puede ver los productos y hacer pedidos.
    *   Los usuarios registrados solo pueden ver su propio perfil y sus propios pedidos.
    *   Solo los usuarios registrados dentro de la tabla `administradores` pueden modificar productos, editar los textos del sitio y gestionar todos los pedidos.

---

## ⚙️ 3. Backend

El backend funciona como el motor lógico y el intermediario entre la base de datos y la interfaz de usuario en flujos donde se requiere procesamiento en el servidor.

*   **Tecnologías Utilizadas**: Escrito en **Python** utilizando el framework **FastAPI**, conocido por su alto rendimiento y documentación automática (Swagger).
*   **ORM (Object-Relational Mapping)**: Utiliza **SQLAlchemy** para interactuar con la base de datos de Supabase utilizando código Python en lugar de consultas SQL crudas.
*   **Componentes Clave**:
    *   `main.py`: Contiene la configuración de la aplicación, middleware de CORS (para permitir peticiones desde el frontend) y la definición de las rutas (endpoints).
    *   `models.py`: Traduce la estructura física de las tablas de PostgreSQL (usuarios, productos, pedidos, etc.) a clases orientadas a objetos de Python.
    *   `schemas.py`: Define el formato exacto en el que el servidor debe recibir y enviar datos utilizando validaciones de Pydantic.
    *   `auth_utils.py`: Herramientas para validar los tokens de acceso enviados desde el frontend y asegurarse de que sólo los administradores autorizados puedan acceder a ciertas funciones.

---

## 🔌 4. Creación de APIs (Endpoints del Backend)

El backend expone varias APIs que permiten al frontend realizar operaciones complejas de forma segura. Se agrupan de la siguiente manera:

### A. Autenticación y Cuentas
*   `POST /api/auth/client/register`: Crea un nuevo cliente en el sistema autenticado de Supabase, lo que a su vez inserta su perfil detallado en la tabla `public.usuarios`.
*   `POST /api/auth/client/login`: Valida el correo y contraseña del cliente, devolviendo un token de acceso seguro (JWT).
*   `POST /api/auth/admin/login`: Permite el acceso a la cuenta del administrador.

### B. Gestión de Pedidos
*   `POST /api/pedidos`: Recibe una estructura con la información del cliente y una lista detallada con los productos, cantidades y precios para registrar el pedido y sus respectivos sub-detalles en la base de datos.

### C. Panel Administrativo (Requiere autenticación de Administrador)
*   `GET /api/admin/productos`: Devuelve la lista completa de todos los productos (activos e inactivos).
*   `POST /api/admin/productos`: Añade un nuevo postre o producto al catálogo.
*   `PUT /api/admin/productos/{id_producto}`: Modifica los datos de un producto existente (precio, descripción, foto, etc.).
*   `GET /api/admin/contenido`: Obtiene las configuraciones dinámicas del sitio como un diccionario JSON.
*   `POST /api/admin/contenido`: Guarda los nuevos textos o configuraciones del sitio actualizados por el administrador.
