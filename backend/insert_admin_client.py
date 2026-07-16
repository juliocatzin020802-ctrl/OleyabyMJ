import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")

email = "admin@oleya.mx"
password = "oleya2024"
name = "Administrador Oleya"

print("Iniciando inserción de administrador usando cliente Supabase HTTP...")

try:
    supabase = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
    
    # 1. Iniciar sesión para obtener el token JWT y el UUID
    print(f"Iniciando sesión como {email}...")
    auth_res = supabase.auth.sign_in_with_password({
        "email": email,
        "password": password
    })
    
    user_id = auth_res.user.id
    print(f"Inicio de sesión exitoso. UUID del usuario: {user_id}")
    
    # 2. Insertar en la tabla public.administradores usando la sesión del usuario
    print("Insertando en la tabla public.administradores...")
    db_res = supabase.from_("administradores").upsert({
        "id_admin": user_id,
        "nombre": name,
        "email": email
    }).execute()
    
    print("¡Administrador registrado en la base de datos con éxito!")
    print(db_res)
    
except Exception as e:
    print(f"Error al registrar administrador: {e}")
