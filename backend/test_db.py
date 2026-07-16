import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

try:
    db_url = "postgresql://postgres:Oleya2909$%25@db.xwwgedbdfahxrtphuzdd.supabase.co:5432/postgres"
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()

    cur.execute("""
    SELECT event_object_table, trigger_name 
    FROM information_schema.triggers 
    WHERE trigger_name = 'on_auth_user_created';
    """)
    print("Trigger info:", cur.fetchall())

    cur.execute("""
    SELECT proname 
    FROM pg_proc 
    WHERE proname = 'handle_new_user';
    """)
    print("Function info:", cur.fetchall())
    
    cur.execute("SELECT count(*) FROM public.usuarios;")
    print("Usuarios count:", cur.fetchone()[0])
    
    cur.execute("SELECT count(*) FROM auth.users;")
    print("Auth Users count:", cur.fetchone()[0])

    cur.close()
    conn.close()
except Exception as e:
    print("Error:", e)
