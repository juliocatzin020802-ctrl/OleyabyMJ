from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
import uuid

# ==========================================
# ETIQUETAS
# ==========================================
class EtiquetaBase(BaseModel):
    nombre: str = Field(..., max_length=50)

class EtiquetaResponse(EtiquetaBase):
    id_etiqueta: uuid.UUID

    class Config:
        from_attributes = True

# ==========================================
# USUARIOS
# ==========================================
class UsuarioBase(BaseModel):
    nombre: str = Field(..., max_length=150)
    email: EmailStr
    telefono: Optional[str] = Field(None, max_length=20)
    direccion: Optional[str] = Field(None, max_length=255)
    colonia: Optional[str] = Field(None, max_length=100)

class UsuarioCreate(UsuarioBase):
    pass

class UsuarioResponse(UsuarioBase):
    id_usuario: uuid.UUID
    fecha_registro: datetime

    class Config:
        from_attributes = True

# ==========================================
# PRODUCTOS
# ==========================================
class ProductoBase(BaseModel):
    nombre: str = Field(..., max_length=150)
    descripcion: Optional[str] = None
    precio: float = Field(..., ge=0)
    emoji: Optional[str] = Field(None, max_length=10)
    foto_url: Optional[str] = Field(None, max_length=500)
    id_etiqueta: Optional[uuid.UUID] = None
    activo: bool = True

class ProductoCreate(ProductoBase):
    pass

class ProductoResponse(ProductoBase):
    id_producto: uuid.UUID
    fecha_creacion: datetime
    etiqueta: Optional[EtiquetaResponse] = None

    class Config:
        from_attributes = True

# ==========================================
# DETALLES DE PEDIDO
# ==========================================
class DetallePedidoBase(BaseModel):
    id_producto: Optional[uuid.UUID] = None
    descripcion_personalizada: Optional[str] = Field(None, max_length=255)
    cantidad: int = Field(1, ge=1)
    precio_unitario: float = Field(..., ge=0)

class DetallePedidoCreate(DetallePedidoBase):
    pass

class DetallePedidoResponse(DetallePedidoBase):
    id_detalle: uuid.UUID
    id_pedido: uuid.UUID

    class Config:
        from_attributes = True

# ==========================================
# PEDIDOS
# ==========================================
class PedidoBase(BaseModel):
    nombre_cliente: str = Field(..., max_length=150)
    telefono_cliente: Optional[str] = Field(None, max_length=20)
    notas: Optional[str] = None
    canal: str = Field("whatsapp", max_length=20)
    estado: str = Field("pendiente", max_length=50)

class PedidoCreate(PedidoBase):
    id_usuario: Optional[uuid.UUID] = None
    detalles: List[DetallePedidoCreate]

class PedidoResponse(PedidoBase):
    id_pedido: uuid.UUID
    id_usuario: Optional[uuid.UUID] = None
    fecha_pedido: datetime
    detalles: List[DetallePedidoResponse] = []

    class Config:
        from_attributes = True
