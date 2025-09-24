from app import app
from app.services import text2image_service
from flask import send_file

@app.route('/create-composite-image', methods=['POST'])
def create_composite_image_route():

    foreground_file = 'path/to/object_foreground.png'
    mask_file = 'path/to/object_mask.png'
    
    background_file = 'new_background.png' 

    final_image_path = text2image_service.composite_images(
        foreground_file, 
        mask_file, 
        background_file
    )

    if final_image_path:
        return send_file(final_image_path, mimetype='image/png')
    else:
        return {"error": "Failed to create image"}, 500