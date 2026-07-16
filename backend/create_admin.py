import os
import psycopg2
from supabase import create_client
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")

email = "admin@oleya.mx"
password = "oleya2024"
name = "Administrador Oleya"

print(f"Iniciando creación de administrador: {email}")

# 1. Crear usuario en Auth mediante Supabase Client (si no existe)
try:
    supabase = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
    # Registrar usuario
    res = supabase.auth.sign_up({
        "email": email,
        "password": password,
        "options": {
            "data": {
                "nombre": name
            }
        }
    })
    print("Usuario registrado en Supabase Auth exitosamente o ya existía.")
except Exception as e:
    print(f"Nota en registro de Auth (tal vez ya existe): {e}")

# 2. Conectar a la base de datos y forzar la confirmación de correo y la entrada en administradores
try:
    print("Conectando directamente a la base de datos en puerto 5432...")
    conn = psycopg2.connect(
        host="db.xwwgedbdfahxrtphuzdd.supabase.co",
        port=5432,
        user="postgres",
        password="Oleya2909$%",
        database="postgres"
    )
    cur = conn.cursor()
    
    # Confirmar correo en auth.users
    cur.execute("""
        UPDATE auth.users 
        SET email_confirmed_at = NOW(), 
            confirmed_at = NOW(), 
            last_sign_in_at = NOW() 
        WHERE email = %s;
    """, (email,))
    print("Correo electrónico marcado como confirmado en auth.users.")
    
    # Obtener el ID del usuario
    cur.execute("SELECT id FROM auth.users WHERE email = %s;", (email,))
    row = cur.fetchone()
    if row:
        user_uuid = row[0]
        print(f"UUID obtenido: {user_uuid}")
        
        # Insertar en public.usuarios (el trigger handle_new_user ya debería haberlo hecho, pero lo aseguramos)
        cur.execute("""
            INSERT INTO public.usuarios (id_usuario, nombre, email)
            VALUES (%s, %s, %s)
            ON CONFLICT (id_usuario) DO UPDATE 
            SET nombre = EXCLUDED.nombre, email = EXCLUDED.email;
        """, (user_uuid, name, email))
        print("Usuario asegurado en la tabla public.usuarios.")
        
        # Insertar en public.administradores
        cur.execute("""
            INSERT INTO public.administradores (id_admin, nombre, email)
            VALUES (%s, %s, %s)
            ON CONFLICT (id_admin) DO UPDATE
            SET nombre = EXCLUDED.nombre, email = EXCLUDED.email;
        """, (user_uuid, name, email))
        print("Usuario registrado en la tabla public.administradores.")
        
        conn.commit()
        print("¡Transacción completada con éxito!")
    else:
        print("No se encontró el usuario en auth.users tras registrar.")
        
    cur.close()
    conn.close()
except Exception as e:
    print(f"Error al conectar o ejecutar queries en Postgres: {e}")
