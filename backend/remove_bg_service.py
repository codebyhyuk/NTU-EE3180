import os
import requests
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class RemoveBGService:
    def __init__(self):
        self.api_key = os.getenv('REMOVE_BG_API_KEY')
        self.api_url = "https://api.remove.bg/v1.0/removebg"
        
        if not self.api_key:
            raise ValueError("REMOVE_BG_API_KEY not found in environment variables")
    
    def remove_background(self, image_path, output_path):
        """
        Remove background from an image using remove.bg API
        """
        try:
            files = {'image_file': open(image_path, 'rb')}
            data = {'size': 'auto'}
            headers = {'X-Api-Key': self.api_key}
            
            response = requests.post(
                self.api_url,
                files=files,
                data=data,
                headers=headers
            )
            
            if response.status_code == requests.codes.ok:
                with open(output_path, 'wb') as out:
                    out.write(response.content)
                print(f"✅ Background removed successfully! Saved to: {output_path}")
                return True
            else:
                print(f"❌ Error: {response.status_code}, {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Exception occurred: {str(e)}")
            return False
        finally:
            if 'files' in locals():
                files['image_file'].close()

def test_remove_bg():
    service = RemoveBGService()
    
    # Automatically detect first image in test_images folder
    folder = 'test_images'
    if not os.path.exists(folder):
        print(f"❌ Folder not found: {folder}")
        return
    
    # Find first .png or .jpg file
    candidates = [f for f in os.listdir(folder) if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
    if not candidates:
        print(f"⚠️  Please add a test image (.png or .jpg) in '{folder}' first")
        return
    
    input_image = os.path.join(folder, candidates[0])  # use first image found
    output_image = os.path.join(folder, "output.png")
    
    print(f"🔍 Using input image: {input_image}")
    success = service.remove_background(input_image, output_image)
    if success:
        print("🎉 Background removal test passed!")
        import webbrowser
        webbrowser.open(os.path.abspath(output_image))
    else:
        print("❌ Background removal test failed!")

if __name__ == "__main__":
    test_remove_bg()
