from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
from dotenv import load_dotenv

# Load backend/.env
ENV_PATH = Path(__file__).resolve().parents[1] / ".env" 
load_dotenv(dotenv_path=ENV_PATH)

app = FastAPI(title="DIP Image Background Removal with AI APIs")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", "http://127.0.0.1:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"ok": True, "service": "DIP: Image Background Removal with AI"}

@app.get("/health")
def health():
    return {"status": "up"}

@app.get("/version")
def version():
    return {"version": "0.1.0"}

from .routes import (
    image_io_routes,
    remove_bg_routes,
    text2image_routes,
    image_crop_routes,
)

app.include_router(image_io_routes.router)
app.include_router(remove_bg_routes.router)
app.include_router(text2image_routes.router)
app.include_router(image_crop_routes.router)
