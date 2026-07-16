import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

SUPABASE_DB_URL = os.getenv("SUPABASE_DB_URL")

# Intentar varias combinaciones
tests = [
    # Test 1: URL original con escape de %
    {
        "name": "Pooler port 6543 (Transaction mode) with escaped URL",
        "url": SUPABASE_DB_URL.replace('%@', '%25@')
    },
    # Test 2: Pooler port 5432 (Session mode) with escaped URL
    {
        "name": "Pooler port 5432 (Session mode) with escaped URL",
        "url": SUPABASE_DB_URL.replace('%@', '%25@').replace(':6543/', ':5432/')
    },
    # Test 3: Direct connection host on port 5432 with standard postgres user
    {
        "name": "Direct connection via IP or alternative host",
        "url": "postgresql://postgres:Oleya2909%25@db.xwwgedbdfahxrtphuzdd.supabase.co:5432/postgres"
    }
]

for t in tests:
    print(f"Probando: {t['name']}")
    try:
        conn = psycopg2.connect(t['url'])
        print("  -> ¡Conexión exitosa!")
        conn.close()
        break
    except Exception as e:
        print(f"  -> Error: {e}")
