from datetime import datetime, timedelta
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
import jwt  # Usualmente PyJWT

# Configuración básica de firmas y algoritmos para tokens JWT
SECRET_KEY = "SUPER_SECRET_KEY_FOR_OLEYA_BAKERY"  # Cambiar por variable de entorno en prod
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

# Configuración del esquema de autenticación por cabecera HTTP Bearer Token
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/client/login")

# ====================================================================
# EXPLICACIÓN DEL MANEJO DE JWT EN FASTAPI:
#
# 1. Registro/Login: El cliente envía sus credenciales. Si son válidas,
#    generamos un Token firmado con `create_access_token` que contiene claims
#    como el ID del usuario ("sub") y su rol o expiración.
# 2. Retorno: El token es devuelto al frontend en una respuesta JSON.
# 3. Almacenamiento: El frontend lo guarda en localStorage o cookies HTTPOnly.
# 4. Solicitudes Protegidas: El frontend adjunta el token en la cabecera
#    "Authorization: Bearer <TOKEN>".
# 5. Validación: FastAPI intercepta la petición usando la dependencia
#    `Depends(oauth2_scheme)`, decodifica el token con `jwt.decode` usando la
#    SECRET_KEY, valida la expiración y retorna el usuario autenticado.
# ====================================================================

# Stubs para hash y verificación de contraseñas (Simulando bcrypt / passlib)
def verify_password(plain_password: str, hashed_password: str) -> bool:
    # Simulamos verificación. En producción: return pwd_context.verify(plain_password, hashed_password)
    return plain_password == hashed_password.replace("_hashed", "")

def get_password_hash(password: str) -> str:
    # Simulamos hashing. En producción: return pwd_context.hash(password)
    return f"{password}_hashed"

# Generador de Tokens de Acceso
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# Dependencia para obtener el usuario autenticado actual desde el token
async def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudo validar el token de acceso",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        # Decodificación del token JWT
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        role: str = payload.get("role", "client")
        if user_id is None:
            raise credentials_exception
        
        # Simulamos la obtención del usuario de la BD
        return {"id_usuario": user_id, "role": role, "email": payload.get("email")}
        
    except jwt.PyJWTError:
        raise credentials_exception

# Dependencia exclusiva para proteger endpoints de administrador
async def get_current_admin(token: str = Depends(oauth2_scheme)) -> dict:
    user = await get_current_user(token)
    if user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operación no permitida. Se requieren permisos de administrador."
        )
    return user
