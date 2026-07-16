import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

# Lista de regiones comunes de AWS de Supabase
regions = [
    "us-east-1",     # N. Virginia
    "us-east-2",     # Ohio
    "us-west-1",     # N. California
    "us-west-2",     # Oregon
    "ca-central-1",  # Canada
    "eu-west-1",     # Ireland
    "eu-west-2",     # London
    "eu-west-3",     # Paris
    "eu-central-1",  # Frankfurt
    "ap-southeast-1",# Singapore
    "ap-southeast-2",# Sydney
    "ap-northeast-1",# Tokyo
    "ap-northeast-2",# Seoul
    "ap-south-1",    # Mumbai
    "sa-east-1"      # São Paulo
]

user = "postgres.xwwgedbdfahxrtphuzdd"
password = "Oleya2909$%"
db_name = "postgres"

for r in regions:
    host = f"aws-0-{r}.pooler.supabase.com"
    print(f"Probando región: {r} (host: {host})")
    try:
        # Intentar conectar tanto en puerto 6543 como 5432
        for port in [6543, 5432]:
            try:
                conn = psycopg2.connect(
                    host=host,
                    port=port,
                    user=user,
                    password=password,
                    database=db_name,
                    connect_timeout=3
                )
                print(f"  -> ¡CONEXIÓN EXITOSA EN {r} (puerto {port})!")
                conn.close()
                exit(0)
            except Exception as port_err:
                err_msg = str(port_err)
                if "tenant/user" not in err_msg and "timeout" not in err_msg:
                    print(f"    Puerto {port} error: {err_msg}")
    except Exception as e:
        print(f"  -> Error general: {e}")

print("Ninguna región funcionó.")
