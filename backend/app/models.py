import uuid
from datetime import datetime
from typing import List, Optional
from sqlalchemy import String, Numeric, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

class Base(DeclarativeBase):
    pass

class Administrador(Base):
    __tablename__ = "administradores"

    id_admin: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    nombre: Mapped[str] = mapped_column(String(150), nullable=False)
    email: Mapped[str] = mapped_column(String(150), unique=True, nullable=False)
    fecha_registro: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)


class Usuario(Base):
    __tablename__ = "usuarios"

    id_usuario: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    nombre: Mapped[str] = mapped_column(String(150), nullable=False)
    email: Mapped[str] = mapped_column(String(150), unique=True, nullable=False)
    telefono: Mapped[Optional[str]] = mapped_column(String(20))
    direccion: Mapped[Optional[str]] = mapped_column(String(255))
    colonia: Mapped[Optional[str]] = mapped_column(String(100))
    fecha_registro: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    # Relaciones
    pedidos: Mapped[List["Pedido"]] = relationship(back_populates="usuario")


class Etiqueta(Base):
    __tablename__ = "etiquetas"

    id_etiqueta: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    nombre: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)

    # Relaciones
    productos: Mapped[List["Producto"]] = relationship(back_populates="etiqueta")


class Producto(Base):
    __tablename__ = "productos"

    id_producto: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    nombre: Mapped[str] = mapped_column(String(150), nullable=False)
    descripcion: Mapped[Optional[str]] = mapped_column(Text)
    precio: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    emoji: Mapped[Optional[str]] = mapped_column(String(10))
    foto_url: Mapped[Optional[str]] = mapped_column(String(500))
    id_etiqueta: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("etiquetas.id_etiqueta", ondelete="SET NULL"))
    activo: Mapped[bool] = mapped_column(Boolean, default=True)
    fecha_creacion: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    # Relaciones
    etiqueta: Mapped[Optional["Etiqueta"]] = relationship(back_populates="productos")
    detalles_pedido: Mapped[List["DetallePedido"]] = relationship(back_populates="producto")


class Pedido(Base):
    __tablename__ = "pedidos"

    id_pedido: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    id_usuario: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("usuarios.id_usuario", ondelete="SET NULL"))
    nombre_cliente: Mapped[str] = mapped_column(String(150), nullable=False)
    telefono_cliente: Mapped[Optional[str]] = mapped_column(String(20))
    notas: Mapped[Optional[str]] = mapped_column(Text)
    canal: Mapped[str] = mapped_column(String(20), default="whatsapp")
    estado: Mapped[str] = mapped_column(String(50), default="pendiente")
    fecha_pedido: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    # Relaciones
    usuario: Mapped[Optional["Usuario"]] = relationship(back_populates="pedidos")
    detalles: Mapped[List["DetallePedido"]] = relationship(back_populates="pedido", cascade="all, delete-orphan")


class DetallePedido(Base):
    __tablename__ = "detalle_pedidos"

    id_detalle: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    id_pedido: Mapped[uuid.UUID] = mapped_column(ForeignKey("pedidos.id_pedido", ondelete="CASCADE"), nullable=False)
    id_producto: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("productos.id_producto", ondelete="SET NULL"))
    descripcion_personalizada: Mapped[Optional[str]] = mapped_column(String(255))
    cantidad: Mapped[int] = mapped_column(default=1, nullable=False)
    precio_unitario: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)

    # Relaciones
    pedido: Mapped["Pedido"] = relationship(back_populates="detalles")
    producto: Mapped[Optional["Producto"]] = relationship(back_populates="detalles_pedido")


class ContenidoSitio(Base):
    __tablename__ = "contenido_sitio"

    id_contenido: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    clave: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    valor: Mapped[Optional[str]] = mapped_column(Text)
    fecha_actualizacion: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
