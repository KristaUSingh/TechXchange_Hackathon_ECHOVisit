import psycopg2
import os
from dotenv import load_dotenv
from models import CREATE_DOCTOR_TABLE, CREATE_PATIENT_TABLE, CREATE_VISIT_TABLE

load_dotenv("pass.env")

connection = psycopg2.connect(
    dbname=os.getenv("DB_NAME"),
    user=os.getenv("DB_USER"),
    password=os.getenv("DB_PASSWORD"),
    host=os.getenv("DB_HOST"),
    port=os.getenv("DB_PORT")
)

cursor = connection.cursor()

# Run table creation queries
cursor.execute(CREATE_DOCTOR_TABLE)
cursor.execute(CREATE_PATIENT_TABLE)
cursor.execute(CREATE_VISIT_TABLE)

connection.commit()

cursor.close()
connection.close()




