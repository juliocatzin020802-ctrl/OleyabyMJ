from fastapi import FastAPI, HTTPException, status, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Dict
import uuid
import os

from supabase import create_client, Client
from dotenv import load_dotenv

# Base de datos y Modelos
from app.database import get_db, engine
from app import models, schemas
from app.auth_utils import get_current_admin

load_dotenv()

# Creamos las tablas si no existieran (aunque en Supabase se hace por SQL)
# models.Base.metadata.create_all(bind=engine)

# Cliente de Supabase para Autenticación
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")

if SUPABASE_URL and SUPABASE_ANON_KEY and SUPABASE_ANON_KEY != "TU_ANON_KEY_AQUI":
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
else:
    supabase = None

app = FastAPI(
    title="Oleya by M.J. — API Backend (Supabase Migrated)",
    description="Backend conectado a Supabase PostgreSQL usando SQLAlchemy.",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ====================================================================
# FLOW 1: AUTENTICACIÓN (LOGIN & REGISTRO) - VIA SUPABASE
# ====================================================================

@app.post("/api/auth/client/register", status_code=status.HTTP_201_CREATED)
def register_client(usuario: schemas.UsuarioCreate, payload: Dict[str, str]):
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase no está configurado (Falta SUPABASE_ANON_KEY).")
    
    password = payload.get("password")
    if not password or len(password) < 6:
        raise HTTPException(status_code=400, detail="La contraseña debe tener al menos 6 caracteres.")
    
    # Supabase Auth: Crea el usuario en auth.users, el trigger insertará en public.usuarios
    try:
        res = supabase.auth.sign_up({
            "email": usuario.email,
            "password": password,
            "options": {
                "data": {
                    "nombre": usuario.nombre,
                    "telefono": usuario.telefono,
                    "direccion": usuario.direccion,
                    "colonia": usuario.colonia
                }
            }
        })
        return {"mensaje": "Registro exitoso en Supabase", "user": res.user.id if res.user else None}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/auth/client/login", status_code=status.HTTP_200_OK)
def login_client(payload: Dict[str, str]):
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase no está configurado.")
        
    try:
        res = supabase.auth.sign_in_with_password({
            "email": payload.get("email"),
            "password": payload.get("password")
        })
        return {
            "access_token": res.session.access_token,
            "token_type": "bearer",
            "user": {
                "id_usuario": res.user.id,
                "email": res.user.email,
                "nombre": res.user.user_metadata.get("nombre")
            }
        }
    except Exception as e:
        raise HTTPException(status_code=401, detail="Credenciales incorrectas: " + str(e))

@app.post("/api/auth/admin/login", status_code=status.HTTP_200_OK)
def login_admin(payload: Dict[str, str]):
    # Mismo login con Supabase, la validación de admin real requeriría verificar la tabla
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase no está configurado.")
    try:
        res = supabase.auth.sign_in_with_password({
            "email": payload.get("email"),
            "password": payload.get("password")
        })
        return {
            "access_token": res.session.access_token,
            "token_type": "bearer",
            "user": {"email": res.user.email}
        }
    except Exception as e:
        raise HTTPException(status_code=401, detail="Error de login de admin: " + str(e))


# ====================================================================
# FLOW 2: GESTIÓN DE PEDIDOS
# ====================================================================

@app.post("/api/pedidos", response_model=schemas.PedidoResponse, status_code=status.HTTP_201_CREATED)
def create_pedido(pedido: schemas.PedidoCreate, db: Session = Depends(get_db)):
    if not pedido.detalles:
        raise HTTPException(status_code=400, detail="El pedido debe contener detalles.")

    nuevo_pedido = models.Pedido(
        id_usuario=pedido.id_usuario,
        nombre_cliente=pedido.nombre_cliente,
        telefono_cliente=pedido.telefono_cliente,
        notas=pedido.notas,
        canal=pedido.canal,
        estado=pedido.estado
    )
    db.add(nuevo_pedido)
    db.flush() # Para obtener el ID del pedido
    
    for d in pedido.detalles:
        detalle = models.DetallePedido(
            id_pedido=nuevo_pedido.id_pedido,
            id_producto=d.id_producto,
            descripcion_personalizada=d.descripcion_personalizada,
            cantidad=d.cantidad,
            precio_unitario=d.precio_unitario
        )
        db.add(detalle)
        
    db.commit()
    db.refresh(nuevo_pedido)
    return nuevo_pedido


# ====================================================================
# FLOW 3: PANEL ADMIN (GESTIÓN DE CATÁLOGO & CONTENIDO)
# ====================================================================

@app.get("/api/admin/productos", response_model=List[schemas.ProductoResponse])
def admin_get_all_productos(db: Session = Depends(get_db), admin: dict = Depends(get_current_admin)):
    return db.query(models.Producto).all()

@app.post("/api/admin/productos", response_model=schemas.ProductoResponse, status_code=status.HTTP_201_CREATED)
def admin_create_producto(producto: schemas.ProductoCreate, db: Session = Depends(get_db), admin: dict = Depends(get_current_admin)):
    nuevo_prod = models.Producto(**producto.model_dump())
    db.add(nuevo_prod)
    db.commit()
    db.refresh(nuevo_prod)
    return nuevo_prod

@app.put("/api/admin/productos/{id_producto}", response_model=schemas.ProductoResponse)
def admin_update_producto(id_producto: uuid.UUID, producto: schemas.ProductoCreate, db: Session = Depends(get_db), admin: dict = Depends(get_current_admin)):
    prod_db = db.query(models.Producto).filter(models.Producto.id_producto == id_producto).first()
    if not prod_db:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
        
    for key, val in producto.model_dump().items():
        setattr(prod_db, key, val)
        
    db.commit()
    db.refresh(prod_db)
    return prod_db

@app.get("/api/admin/contenido")
def admin_get_contenido(db: Session = Depends(get_db), admin: dict = Depends(get_current_admin)):
    contenidos = db.query(models.ContenidoSitio).all()
    # Convertir formato array a un diccionario clave-valor para compatibilidad con el frontend
    return {c.clave: c.valor for c in contenidos}

@app.post("/api/admin/contenido")
def admin_update_contenido(nuevo_contenido: Dict[str, str], db: Session = Depends(get_db), admin: dict = Depends(get_current_admin)):
    for key, val in nuevo_contenido.items():
        contenido = db.query(models.ContenidoSitio).filter(models.ContenidoSitio.clave == key).first()
        if contenido:
            contenido.valor = val
        else:
            nuevo = models.ContenidoSitio(clave=key, valor=val)
            db.add(nuevo)
    db.commit()
    return nuevo_contenido
