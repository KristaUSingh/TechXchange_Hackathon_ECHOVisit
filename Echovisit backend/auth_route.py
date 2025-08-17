from supabase import create_client
from supa_client import supabase, supabase_admin
import os
from dotenv import load_dotenv

load_dotenv()

supabase = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_ANON_KEY")
)

def sign_up_user(email: str, password: str, role: str, name: str, clinic=None, birthday=None):
    # Normalize email
    email = (email or "").strip().lower()

    # Step 1: Create user in Supabase Auth with role in metadata
    response = supabase.auth.sign_up({
        "email": email,
        "password": password,
        "options": {
            "data": {"role": role}
        }
    })

    if not getattr(response, "user", None):
        return {"error": "Sign-up failed", "details": response}

    user_id = response.user.id  # Supabase UUID

    # Step 2: Insert into the correct table
    if role == "doctor":
        supabase.table("doctors").insert({
            "user_id": user_id,
            "name": name,
            "clinic": clinic,
            "email": email
        }).execute()
    elif role == "patient":
        supabase.table("patients").insert({
            "user_id": user_id,
            "name": name,
            "birthday": birthday,
            "email": email
        }).execute()

    return {"success": True, "user_id": user_id}

# -- If you need to set/update another user's role later (server-side), use admin:
def admin_set_role(user_id: str, role: str):
    return supabase_admin.auth.admin.update_user_by_id(user_id, {
        "user_metadata": {"role": role}
    })
