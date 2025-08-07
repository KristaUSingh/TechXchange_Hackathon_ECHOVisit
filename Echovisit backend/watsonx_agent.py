import os
from dotenv import load_dotenv
from ibm_watsonx_ai.foundation_models import Model
from ibm_watsonx_ai.metanames import GenTextParamsMetaNames as GenParams
import json

load_dotenv()  # Load from .env file

# Credentials
api_key = os.getenv("WATSONX_API_KEY")
project_id = os.getenv("WATSONX_PROJECT_ID")
region = "us-south"  
model_id = "ibm/granite-3-8b-instruct"  

# Generation parameters
parameters = {
    GenParams.DECODING_METHOD: "sample",
    GenParams.MAX_NEW_TOKENS: 2000,
    GenParams.TEMPERATURE: 0.7,
}

# Initialize the model
model = Model(
    model_id=model_id,
    params=parameters,
    credentials={
        "apikey": api_key,
        "url": f"https://{region}.ml.cloud.ibm.com"
    },
    project_id=project_id
)

# Run a prompt 
def run_prompt(prompt_text):
    response = model.generate(prompt=prompt_text)
    return response["results"][0]["generated_text"]

