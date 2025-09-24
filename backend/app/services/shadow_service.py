import os, httpx

class ShadowGenerationService:
    def __init__(self, api_key=None):
        self.api_key = api_key or os.getenv("REMOVE_BG_API_KEY")
        if not self.api_key:
            raise RuntimeError("REMOVE_BG_API_KEY missing")
        self.url = "https://api.remove.bg/v1.0/removebg"