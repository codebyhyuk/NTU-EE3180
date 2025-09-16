import os
from remove_bg_service import RemoveBGService

# Paths relative to repo root; adjust if your file is elsewhere
INPUT  = os.path.join("backend", "test_images", "Input.png")
OUTPUT = os.path.join("backend", "test_images", "Output.png")

if __name__ == "__main__":
    svc = RemoveBGService()
    ok = svc.remove_background(INPUT, OUTPUT)
    print("Success?" , ok)
