from PIL import Image


class Text2ImageService:
    def composite_images(foreground_path, mask_path, background_path):
        try:
            background_img = Image.open(background_path)
            foreground_img = Image.open(foreground_path)
            mask_img = Image.open(mask_path)

            # Ensure the mask is in the correct mode for composition
            mask_img = mask_img.convert("L")

            final_image = Image.composite(foreground_img, background_img, mask_img)
            
            final_path = 'final_image.png'
            final_image.save(final_path)
            print(f"✅ Successfully combined images and saved as '{final_path}'")
            return final_path

        except FileNotFoundError as e:
            print(f"Error: Missing file -> {e.filename}")
            return None