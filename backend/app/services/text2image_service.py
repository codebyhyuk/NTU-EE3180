from PIL import Image
from openai import OpenAI
import requests
import os

class Text2ImageService:
    def __init__(self):
        self.client = OpenAI()

    def generate_and_download_background(self, prompt: str) -> str | None:
        """Generates an image with DALL-E and downloads it."""
        try:
            print(f"🎨 Generating background with prompt: {prompt}")
            response = self.client.images.generate(
                model="dall-e-3",
                prompt=prompt,
                n=1,
                size="1024x1024",
            )
            image_url = response.data[0].url
            
            image_data = requests.get(image_url).content
            background_path = "new_background.png"
            with open(background_path, "wb") as f:
                f.write(image_data)
            
            print(f"✅ Background downloaded to {background_path}")
            return background_path

        except Exception as e:
            print(f"Error generating or downloading image: {e}")
            return None

    def composite_images(self, foreground_path: str, mask_path: str, background_path: str) -> str | None:
        """Combines the three images into a final product."""
        try:
            background_img = Image.open(background_path)
            foreground_img = Image.open(foreground_path)
            mask_img = Image.open(mask_path).convert("L")

            final_image = Image.composite(foreground_img, background_img, mask_img)
            
            final_path = 'final_image.png'
            final_image.save(final_path)
            print(f"✅ Successfully combined images and saved as '{final_path}'")
            return final_path

        except FileNotFoundError as e:
            print(f"Error: Missing file -> {e.filename}")
            return None