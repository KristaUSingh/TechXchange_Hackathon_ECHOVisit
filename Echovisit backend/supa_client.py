from supabase import create_client
import os 
from dotenv import load_dotenv

 # reusable Supabase clients (anon + admin/service)

load_dotenv("pass.env")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY") 


supabase = create_client(SUPABASE_URL, SUPABASE_ANON_KEY) #client app calls
supabase_admin = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)