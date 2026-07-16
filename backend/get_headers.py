import urllib.request
import urllib.error
import os
from dotenv import load_dotenv

load_dotenv()

url = os.getenv('SUPABASE_URL') + '/rest/v1/'
headers = {'apikey': os.getenv('SUPABASE_ANON_KEY')}
req = urllib.request.Request(url, headers=headers)
try:
    res = urllib.request.urlopen(req)
except urllib.error.HTTPError as e:
    res = e

for k, v in res.info().items():
    print(f"{k}: {v}")
