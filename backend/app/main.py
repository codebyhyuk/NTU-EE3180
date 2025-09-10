from fastapi import FastAPI

app = FastAPI(title="Image Processing API")

@app.get("/")
def read_root():
    return {"message": "Backend is running!"}